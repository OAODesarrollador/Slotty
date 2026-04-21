"use client";

import { MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { PaymentMethod } from "@/lib/types";
import { formatCurrency, formatDateTime, formatHour } from "@/lib/time";
import { computePaymentBreakdown } from "@/services/payments";

type ServiceItem = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: string;
};

type BarberItem = {
  id: string;
  full_name: string;
  rating: string;
};

type AvailabilitySlot = {
  barberId: string;
  barberName: string;
  start: string;
  end: string;
};

const DEMO_BARBER_NAMES: Record<string, string> = {
  b1: "Alex Pro",
  b2: "Julian Cuts",
  b3: "Maria Nails"
};

const DEMO_SERVICE_SLOT_BLUEPRINTS: Record<string, Record<string, string[]>> = {
  s1: {
    b1: ["09:00", "10:30", "12:00", "15:30", "18:00"],
    b2: ["09:30", "11:00", "14:00", "16:30"]
  },
  s2: {
    b1: ["10:00", "11:30", "13:30", "17:00"]
  },
  s3: {
    b1: ["09:00", "13:00", "17:30"],
    b2: ["10:30", "15:00"]
  },
  s4: {
    b3: ["08:30", "09:15", "10:00", "10:45", "11:30", "16:00", "16:45"]
  }
};

function getDaysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diff / 86400000));
}

function addMinutesToDate(isoDateTime: string, minutes: number) {
  const next = new Date(isoDateTime);
  next.setMinutes(next.getMinutes() + minutes);
  return next.toISOString();
}

function normalizeSlotStart(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString();
}

function buildSlotId(barberId: string, start: string) {
  return `${barberId}::${normalizeSlotStart(start)}`;
}

function parseSlotId(slotId: string) {
  const separator = "::";
  const separatorIndex = slotId.indexOf(separator);
  if (separatorIndex === -1) {
    return null;
  }

  const barberId = slotId.slice(0, separatorIndex);
  const start = slotId.slice(separatorIndex + separator.length);
  if (!barberId || !start) {
    return null;
  }

  return { barberId, start };
}

function buildMercadoPagoFailureMessage(params: URLSearchParams) {
  const explicitError = params.get("error") ?? "";
  const paymentStatus = params.get("collection_status") ?? params.get("status") ?? "";
  const statusDetail = params.get("status_detail") ?? "";
  const paymentId = params.get("payment_id") ?? params.get("collection_id") ?? "";

  const details: string[] = [];

  if (explicitError) {
    details.push(explicitError);
  } else {
    details.push("Hubo un problema al volver desde Mercado Pago.");
  }

  if (paymentStatus) {
    details.push(`Estado informado por Mercado Pago: ${paymentStatus}.`);
  }

  if (statusDetail) {
    details.push(`Detalle: ${statusDetail}.`);
  }

  if (paymentId) {
    details.push(`Referencia del pago: ${paymentId}.`);
  }

  return details.join(" ");
}

function buildDemoSlots(args: {
  serviceId: string;
  barberId: string;
  date: string;
  minDate: string;
  durationMinutes: number;
}) {
  const { serviceId, barberId, date, minDate, durationMinutes } = args;
  const serviceBlueprint = DEMO_SERVICE_SLOT_BLUEPRINTS[serviceId] ?? {};
  const dayOffset = getDaysBetween(minDate, date);

  const shouldHideServiceForDay =
    (serviceId === "s3" && dayOffset % 4 === 2) ||
    (serviceId === "s4" && dayOffset % 3 === 1);

  if (shouldHideServiceForDay) {
    return [] as AvailabilitySlot[];
  }

  const selectedBarberIds = barberId
    ? [barberId]
    : Object.keys(serviceBlueprint);

  const slots = selectedBarberIds.flatMap((currentBarberId) => {
    const baseTimes = serviceBlueprint[currentBarberId] ?? [];

    if (!baseTimes.length) {
      return [] as AvailabilitySlot[];
    }

    const shouldHideBarberForDay =
      (currentBarberId === "b2" && dayOffset % 2 === 0) ||
      (currentBarberId === "b3" && dayOffset % 5 === 3);

    if (shouldHideBarberForDay) {
      return [] as AvailabilitySlot[];
    }

    const visibleTimes = baseTimes.filter((_, index) => (index + dayOffset) % 3 !== 1);

    return visibleTimes.map((time, index) => {
      const [hours, minutes] = time.split(":").map(Number);
      const shiftedMinutes = minutes + (dayOffset % 2) * 15;
      const startsAt = new Date(`${date}T00:00:00`);
      startsAt.setHours(hours, shiftedMinutes + (index % 2 === 0 ? 0 : 5), 0, 0);
      const start = startsAt.toISOString();
      const end = addMinutesToDate(start, durationMinutes);

      return {
        barberId: currentBarberId,
        barberName: DEMO_BARBER_NAMES[currentBarberId] ?? "Profesional",
        start,
        end
      } satisfies AvailabilitySlot;
    });
  });

  return slots.sort((a, b) => a.start.localeCompare(b.start));
}

type PaymentSettings = {
  requiresDeposit: boolean;
  depositType: string;
  depositValue: string;
  allowPayAtStore: boolean;
  allowBankTransfer: boolean;
  allowMercadoPago: boolean;
  transferAlias: string | null;
  transferCbu: string | null;
  transferHolderName: string | null;
  transferBankName: string | null;
};

type BookingDraft = {
  serviceId: string;
  date: string;
  barberId: string;
  selectedSlotId: string;
  name: string;
  phone: string;
  notes: string;
  paymentMethod: PaymentMethod | null;
  payInFull: boolean;
};

export type BookingGuideStep = "service" | "schedule" | "details" | "payment";

interface QuickBookingFlowProps {
  slug: string;
  tenantName: string;
  timezone: string;
  services: ServiceItem[];
  barbersByService: Record<string, BarberItem[]>;
  paymentSettings: PaymentSettings | null;
  initialServiceId?: string;
  initialDate: string;
  minDate: string;
  initialBarberId?: string;
  initialSlotStart?: string;
  initialError?: string;
  hideErrors?: boolean; // Nuevo: para silenciar errores solo en la demo
  isPhoneDemo?: boolean;
  onGuideSectionMount?: (step: BookingGuideStep, node: HTMLDivElement | null) => void;
}

export function QuickBookingFlow({
  slug,
  tenantName,
  timezone,
  services = [],
  barbersByService = {},
  paymentSettings,
  initialServiceId,
  initialDate,
  minDate,
  initialBarberId,
  initialSlotStart,
  initialError,
  hideErrors = false, // Falso por defecto para que las reservas reales sigan mostrando avisos
  isPhoneDemo = false,
  onGuideSectionMount
}: QuickBookingFlowProps) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(initialServiceId ?? (services && services.length > 0 ? services[0].id : ""));
  const [date, setDate] = useState(initialDate);
  const [barberId, setBarberId] = useState(initialBarberId ?? "");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState(initialSlotStart && initialBarberId ? buildSlotId(initialBarberId, initialSlotStart) : "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [payInFull, setPayInFull] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [hoveredServiceId, setHoveredServiceId] = useState<string | null>(null);
  const [demoConfirmation, setDemoConfirmation] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityRequestVersion, setAvailabilityRequestVersion] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string }>({});
  const [returnedFromMercadoFailure, setReturnedFromMercadoFailure] = useState(false);
  const draftStorageKey = `booking-draft:${slug}`;
  const hasRestoredDraftRef = useRef(false);
  const pendingDraftRef = useRef<BookingDraft | null>(null);
  const releasedPendingAppointmentRef = useRef(false);
  
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);

  const bindGuideSection = (step: BookingGuideStep, localRef?: MutableRefObject<HTMLDivElement | null>) => {
    return (node: HTMLDivElement | null) => {
      if (localRef) {
        localRef.current = node;
      }
      onGuideSectionMount?.(step, node);
    };
  };

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId) ?? null,
    [serviceId, services]
  );
  const barbers = serviceId ? barbersByService[serviceId] ?? [] : [];
  const selectedBarber = barberId ? barbers.find((barber) => barber.id === barberId) ?? null : null;
  const isTodaySelected = date === minDate;
  const isPayAtStore = paymentMethod === "pay_at_store";
  const isBankTransfer = paymentMethod === "bank_transfer";
  const payAtStoreOnlyTodayMessage = "El pago en efectivo solo está disponible para reservas de hoy. Ajustamos la fecha para que puedas continuar.";
  const hasTransferDetails = Boolean(
    paymentSettings?.transferAlias ||
    paymentSettings?.transferCbu ||
    paymentSettings?.transferHolderName ||
    paymentSettings?.transferBankName
  );

  useEffect(() => {
    if (paymentMethod === "pay_at_store" && date !== minDate) {
      setDate(minDate);
      setSelectedSlotId("");
      setPaymentNotice(payAtStoreOnlyTodayMessage);
      setValidationIssues([]);
    }
  }, [date, minDate, payAtStoreOnlyTodayMessage, paymentMethod]);

  const uniqueSlots = useMemo(() => {
    const unique = new Map<string, AvailabilitySlot>();
    for (const slot of slots) {
      unique.set(buildSlotId(slot.barberId, slot.start), slot);
    }

    return Array.from(unique.values()).sort(
      (a, b) => a.start.localeCompare(b.start) || a.barberName.localeCompare(b.barberName)
    );
  }, [slots]);

  const fallbackSelectedSlot = useMemo(() => {
    if (!returnedFromMercadoFailure || !selectedSlotId || !selectedService) {
      return null;
    }

    const parsedSlot = parseSlotId(selectedSlotId);
    if (!parsedSlot) {
      return null;
    }

    const alreadyVisible = uniqueSlots.some((slot) => buildSlotId(slot.barberId, slot.start) === selectedSlotId);
    if (alreadyVisible) {
      return null;
    }

    return {
      barberId: parsedSlot.barberId,
      barberName: selectedBarber?.full_name ?? "Profesional",
      start: parsedSlot.start,
      end: addMinutesToDate(parsedSlot.start, selectedService.duration_minutes)
    } satisfies AvailabilitySlot;
  }, [returnedFromMercadoFailure, selectedBarber, selectedService, selectedSlotId, uniqueSlots]);

  const selectedSlot = useMemo(
    () => uniqueSlots.find((slot) => buildSlotId(slot.barberId, slot.start) === selectedSlotId) ?? fallbackSelectedSlot,
    [fallbackSelectedSlot, selectedSlotId, uniqueSlots]
  );
  const paymentBreakdown = useMemo(() => {
    if (!selectedService || !paymentSettings) {
      return null;
    }

    return computePaymentBreakdown(
      Number(selectedService.price),
      {
        requires_deposit: paymentSettings.requiresDeposit,
        deposit_type: paymentSettings.depositType,
        deposit_value: paymentSettings.depositValue
      },
      {
        paymentMethod: paymentMethod ?? undefined,
        payInFull
      }
    );
  }, [selectedService, paymentSettings, paymentMethod, payInFull]);

  useEffect(() => {
    if (!serviceId || !date) {
      setSlots([]);
      return;
    }

    if (isPhoneDemo) {
      setAvailabilityLoading(true);
      const timer = window.setTimeout(() => {
        const nextSlots = buildDemoSlots({
          serviceId,
          barberId,
          date,
          minDate,
          durationMinutes: selectedService?.duration_minutes ?? 30
        });

        setSlots(nextSlots);
        setError("");
        setValidationIssues([]);
        setAvailabilityLoading(false);
      }, 260);

      return () => window.clearTimeout(timer);
    }

    const controller = new AbortController();
    setAvailabilityLoading(true);

    const params = new URLSearchParams({ serviceId, date });
    if (barberId) {
      params.set("barberId", barberId);
    }

    fetch(`/api/public/${slug}/availability?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store"
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error ?? "No se pudo cargar la disponibilidad.");
        }
        return body as { slots: AvailabilitySlot[] };
      })
      .then((body) => {
        setSlots(body.slots ?? []);
        setError("");
        setValidationIssues([]);
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setSlots([]);
        setSelectedSlotId("");
        setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar la disponibilidad.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setAvailabilityLoading(false);
        }
      });

    return () => controller.abort();
  }, [availabilityRequestVersion, barberId, date, isPhoneDemo, minDate, selectedService?.duration_minutes, serviceId, slug]);

  useEffect(() => {
    if (pendingDraftRef.current?.selectedSlotId) {
      const pendingSlotId = pendingDraftRef.current.selectedSlotId;
      const hasPendingSlot = slots.some((slot) => buildSlotId(slot.barberId, slot.start) === pendingSlotId);

      if (hasPendingSlot) {
        setSelectedSlotId(pendingSlotId);
        pendingDraftRef.current = null;
      }
    }
  }, [slots]);

  useEffect(() => {
    if (!selectedSlotId) {
      return;
    }

    if (availabilityLoading || pendingDraftRef.current?.selectedSlotId === selectedSlotId) {
      return;
    }

    if (!selectedSlot) {
      setSelectedSlotId("");
    }
  }, [availabilityLoading, selectedSlot, selectedSlotId]);

  useEffect(() => {
    if (!isPhoneDemo) {
      return;
    }

    setName((current) => current || "Lucas Gomez");
    setPhone((current) => current || "11 3456 7890");
  }, [isPhoneDemo]);

  useEffect(() => {
    if (paymentMethod === "pay_at_store") {
      setPayInFull(false);
    }
  }, [paymentMethod]);

  useEffect(() => {
    setCopyFeedback("");
  }, [paymentMethod]);

  useEffect(() => {
    if (isPhoneDemo || hasRestoredDraftRef.current) {
      return;
    }

    const currentParams = new URLSearchParams(window.location.search);
    if (currentParams.get("mp_return") !== "failure") {
      return;
    }

    setError(buildMercadoPagoFailureMessage(currentParams));

    setReturnedFromMercadoFailure(true);
    hasRestoredDraftRef.current = true;

    try {
      const rawDraft = window.sessionStorage.getItem(draftStorageKey);
      if (!rawDraft) {
        return;
      }

      const returnServiceId = currentParams.get("serviceId") ?? "";
      const returnDate = currentParams.get("date") ?? "";
      const returnBarberId = currentParams.get("barberId") ?? "";
      const returnStart = currentParams.get("start") ?? "";

      const draft = JSON.parse(rawDraft) as Partial<BookingDraft>;
      const nextDraft: BookingDraft = {
        serviceId: returnServiceId || (typeof draft.serviceId === "string" ? draft.serviceId : ""),
        date: returnDate || (typeof draft.date === "string" ? draft.date : ""),
        barberId: returnBarberId || (typeof draft.barberId === "string" ? draft.barberId : ""),
        selectedSlotId:
          returnBarberId && returnStart
            ? buildSlotId(returnBarberId, returnStart)
            : (typeof draft.selectedSlotId === "string" ? draft.selectedSlotId : ""),
        name: typeof draft.name === "string" ? draft.name : "",
        phone: typeof draft.phone === "string" ? draft.phone : "",
        notes: typeof draft.notes === "string" ? draft.notes : "",
        paymentMethod:
          draft.paymentMethod === "pay_at_store" ||
          draft.paymentMethod === "bank_transfer" ||
          draft.paymentMethod === "mercado_pago"
            ? draft.paymentMethod
            : null,
        payInFull: typeof draft.payInFull === "boolean" ? draft.payInFull : false
      };

      pendingDraftRef.current = nextDraft;

      if (nextDraft.serviceId) {
        setServiceId(nextDraft.serviceId);
      }
      if (nextDraft.date) {
        setDate(nextDraft.date);
      }
      if (typeof nextDraft.barberId === "string") {
        setBarberId(nextDraft.barberId);
      }
      if (nextDraft.selectedSlotId) {
        setSelectedSlotId(nextDraft.selectedSlotId);
      }
      setName(nextDraft.name);
      setPhone(nextDraft.phone);
      setNotes(nextDraft.notes);
      setPaymentMethod(nextDraft.paymentMethod);
      setPayInFull(nextDraft.payInFull);
    } catch {
      pendingDraftRef.current = null;
      window.sessionStorage.removeItem(draftStorageKey);
    }
  }, [draftStorageKey, isPhoneDemo]);

  useEffect(() => {
    if (isPhoneDemo || releasedPendingAppointmentRef.current) {
      return;
    }

    const currentParams = new URLSearchParams(window.location.search);
    if (currentParams.get("mp_return") !== "failure") {
      return;
    }

    const appointmentId = currentParams.get("appointmentId");
    if (!appointmentId) {
      releasedPendingAppointmentRef.current = true;
      return;
    }

    releasedPendingAppointmentRef.current = true;

    void fetch(`/api/public/${slug}/mercado-pago/release`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ appointmentId })
    })
      .then(() => {
        setAvailabilityRequestVersion((current) => current + 1);
      })
      .catch(() => {
        releasedPendingAppointmentRef.current = false;
      });
  }, [isPhoneDemo, slug]);

  const persistDraft = () => {
    if (isPhoneDemo) {
      return;
    }

    const draft: BookingDraft = {
      serviceId,
      date,
      barberId,
      selectedSlotId,
      name,
      phone,
      notes,
      paymentMethod,
      payInFull
    };

    window.sessionStorage.setItem(draftStorageKey, JSON.stringify(draft));
  };

  const clearDraft = () => {
    if (isPhoneDemo) {
      return;
    }

    pendingDraftRef.current = null;
    window.sessionStorage.removeItem(draftStorageKey);
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(`${label} copiado.`);
      setTimeout(() => setCopyFeedback(""), 2000);
    } catch {
      setCopyFeedback(`No se pudo copiar ${label.toLowerCase()}.`);
      setTimeout(() => setCopyFeedback(""), 2000);
    }
  };
  const handleServiceChange = (nextServiceId: string) => {
    setServiceId(nextServiceId);
    setBarberId("");
    setSelectedSlotId("");
    setPaymentMethod(null);
    setPayInFull(false);
    setDemoConfirmation("");
        setError("");
        setValidationIssues([]);
    
    // Auto Scroll to next step (Calendar/Professional)
    setTimeout(() => {
      step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSlotSelect = (slot: AvailabilitySlot) => {
    setSelectedSlotId(buildSlotId(slot.barberId, slot.start));
    setPaymentMethod(null);
    setPayInFull(false);
    setDemoConfirmation("");
    
    // Auto Scroll to confirmation step (Personal Data)
    setTimeout(() => {
      step3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const isValidArgentinianPhone = (value: string) => {
    const trimmed = value.trim();
    if (!/^[+\d\s()\-]+$/.test(trimmed)) {
      return false;
    }

    const digits = trimmed.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 13;
  };

  const isValidCustomerName = (value: string) => {
    const trimmed = value.trim();
    return /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]+$/.test(trimmed);
  };

  const validate = () => {
    const nextErrors: { name?: string; phone?: string } = {};

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      nextErrors.name = "Ingresá tu nombre.";
    } else if (trimmedName.length < 3) {
      nextErrors.name = "El nombre debe tener al menos 3 caracteres.";
    } else if (trimmedName.length > 60) {
      nextErrors.name = "El nombre no puede superar los 60 caracteres.";
    } else if (!isValidCustomerName(trimmedName)) {
      nextErrors.name = "El nombre solo puede contener letras y espacios.";
    }

    if (!trimmedPhone) {
      nextErrors.phone = "Ingresá tu teléfono.";
    } else if (!isValidArgentinianPhone(trimmedPhone)) {
      nextErrors.phone = "Ingresá un teléfono válido. Ej: 11 1234 5678 o +54 9 11 1234 5678.";
    }

    setFieldErrors(nextErrors);
    return nextErrors;
  };

  const getValidationIssues = () => {
    const nextErrors = validate();
    const issues: string[] = [];

    if (!selectedService) {
      issues.push("Seleccioná un servicio.");
    }
    if (!date) {
      issues.push("Seleccioná una fecha.");
    }
    if (!selectedSlot) {
      issues.push("Seleccioná un horario.");
    }
    if (!paymentMethod) {
      issues.push("Elegí una forma de pago.");
    }
    if (nextErrors.name) {
      issues.push(nextErrors.name);
    }
    if (nextErrors.phone) {
      issues.push(nextErrors.phone);
    }

    return issues;
  };

  const handleSubmit = async () => {
    const issues = getValidationIssues();
    if (issues.length > 0) {
      setValidationIssues(issues);
      setError("Revisá los datos pendientes para continuar.");
      setDemoConfirmation("");
      return;
    }

    setSubmitting(true);
    setError("");
    setValidationIssues([]);
    setDemoConfirmation("");

    if (isPhoneDemo) {
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      setSubmitting(false);
      setDemoConfirmation(
        `Reserva simulada para ${selectedService?.name ?? "el servicio"} el ${selectedSlot ? formatDateTime(selectedSlot.start, timezone) : "horario elegido"}.`
      );
      return;
    }

    try {
      const response = await fetch(`/api/public/${slug}/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          serviceId: selectedService!.id,
          barberId: selectedSlot!.barberId,
          scheduledAt: selectedSlot!.start,
          paymentMethod: paymentMethod ?? undefined,
          payInFull,
          customer: {
            name: name.trim(),
            phone: phone.trim()
          },
          notes: notes.trim()
        })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "No se pudo confirmar la reserva.");
      }

      if (body.checkoutUrl) {
        persistDraft();
        window.location.href = body.checkoutUrl;
        return;
      }

      clearDraft();
      router.push(`/${slug}/mi-turno/${body.appointmentId}`);
      router.refresh();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo confirmar la reserva.");
      setSubmitting(false);
    }
  };
  return (
    <main className="page" style={{ paddingBottom: "100px" }}>
      <section className="shell stack shell-center" style={{ gap: "35px", paddingTop: "0" }}>
        
        <div className="header-row">
          <div className="stack" style={{ gap: 8 }}>
            <span className="eyebrow">Reserva Premium</span>
            <h1 style={{ fontSize: "2.2rem" }}>Tu próxima experiencia</h1>
            <p className="page-lead" style={{ fontSize: "0.95rem" }}>
              Seleccioná el servicio y profesional que mejor se adapte a tu estilo. 
            </p>
          </div>
        </div>

        {/* STEP 1: SERVICES SELECTION */}
        <section ref={bindGuideSection("service")} className="stack" style={{ gap: 20 }}>
          <div className="stack" style={{ gap: 6 }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Seleccioná el Servicio</h2>
          </div>
          
          <div className="list service-grid-mobile selection-grid">
            {services.map((service) => {
              const active = service.id === serviceId;
              const hovered = isPhoneDemo && hoveredServiceId === service.id && !active;
              return (
                <button
                  key={service.id}
                  type="button"
                  className={isPhoneDemo ? "service-card" : `service-card ${active ? "active" : ""}`}
                  data-phone-demo-service={isPhoneDemo ? "true" : undefined}
                  data-phone-demo-active={isPhoneDemo && active ? "true" : undefined}
                  data-phone-demo-hovered={isPhoneDemo && hovered ? "true" : undefined}
                  onClick={() => handleServiceChange(service.id)}
                  onMouseEnter={isPhoneDemo ? () => setHoveredServiceId(service.id) : undefined}
                  onMouseLeave={isPhoneDemo ? () => setHoveredServiceId(null) : undefined}
                  style={isPhoneDemo ? {
                    zIndex: active ? 1 : 0
                  } : undefined}
                >
                  <div className="service-top">
                    <div className="stack" style={{ gap: 4 }}>
                      <strong style={{ fontSize: "1rem" }}>{service.name}</strong>
                      <small className="muted desktop-show">{service.description ?? "Técnicas tradicionales"}</small>
                    </div>
                    <span className="price-tag">{formatCurrency(service.price)}</span>
                  </div>
                  <div className="chip-row">
                    <span className="chip" style={{ fontSize: "0.7rem", background: "rgba(255,255,255,0.05)" }}>{service.duration_minutes}m</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* STEP 2: PROFESSIONAL & SLOT SELECTION */}
        <div ref={bindGuideSection("schedule", step2Ref)} className="stack" style={{ gap: 24, padding: "4px 0", borderTop: "1px solid var(--line)", scrollMarginTop: "140px" }}>
          <div className="stack" style={{ gap: 6 }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Día y Horario</h2>
            <p className="muted" style={{ fontSize: "0.85rem" }}>Encontrá el espacio perfecto.</p>
          </div>

          <div className="stack" style={{ gap: 20 }}>
            <div className="stack" style={{ gap: 8 }}>
              <span className="eyebrow" style={{ color: "var(--accent)", fontSize: "0.75rem", fontWeight: 800 }}>Seleccioná el Día</span>
              <div 
                style={{ 
                  display: "flex", 
                  gap: "14px", 
                  overflowX: "auto", 
                  padding: "10px 12px 20px",
                  margin: "0 -12px",
                  width: "calc(100% + 24px)",
                  msOverflowStyle: "none",
                  scrollbarWidth: "none"
                }}
                className="hide-scrollbar"
              >
                {Array.from({ length: 14 }).map((_, i) => {
                  const d = new Date(minDate + "T12:00:00");
                  d.setDate(d.getDate() + i);
                  const iso = d.toISOString().split("T")[0];
                  const active = iso === date;
                  
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => {
                        if (!isPayAtStore || iso === minDate) {
                          setDate(iso);
                          setDemoConfirmation("");
                          if (paymentNotice === payAtStoreOnlyTodayMessage) {
                            setPaymentNotice("");
                          }
                        } else {
                          setPaymentNotice(payAtStoreOnlyTodayMessage);
                          setValidationIssues([]);
                        }
                      }}
                      style={{
                        flexShrink: 0,
                        width: "74px",
                        height: "90px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        borderRadius: "20px",
                        background: active ? "rgba(245, 200, 66, 0.12)" : "rgba(255,255,255,0.02)",
                        border: "1px solid",
                        borderColor: active ? "var(--accent)" : "rgba(255,255,255,0.06)",
                        transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                        transform: active ? "scale(1.12)" : "scale(1)",
                        zIndex: active ? 1 : 0,
                            cursor: "pointer",
                        opacity: isPayAtStore && iso !== minDate ? 0.35 : 1
                      }}
                    >
                      <span style={{ fontSize: "0.65rem", opacity: active ? 1 : 0.6, fontWeight: 800, textTransform: "uppercase" }}>
                        {d.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "").slice(0, 3)}
                      </span>
                      <strong style={{ fontSize: "1.3rem", color: active ? "var(--accent)" : "var(--text)" }}>
                        {d.getDate()}
                      </strong>
                      <span style={{ fontSize: "0.6rem", opacity: active ? 0.9 : 0.5, fontWeight: 700 }}>
                        {d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "").slice(0, 3)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: PROFESSIONAL & SLOT SELECTION (BARBER) */}
            <div className="stack" style={{ gap: 20 }}>
              <div className="stack" style={{ gap: 12 }}>
                <span className="eyebrow" style={{ color: "var(--accent)", fontSize: "0.75rem", fontWeight: 800 }}>Barbero</span>
                <div 
                  style={{ 
                    display: "flex", 
                    flexWrap: "nowrap", 
                    overflowX: "auto", 
                    gap: "20px", 
                    padding: "10px 12px 10px",
                    margin: "0 -12px",
                    width: "calc(100% + 24px)",
                    justifyContent: "center" 
                  }}
                  className="hide-scrollbar"
                >
                  {/* ANYONE OPTION */}
                  <button
                    type="button"
                    onClick={() => {
                      setBarberId("");
                      setDemoConfirmation("");
                    }}
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "10px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      transition: "all 0.3s ease",
                      transform: !barberId ? "scale(1.05)" : "scale(1)"
                    }}
                  >
                    <div style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: !barberId ? "rgba(245, 200, 66, 0.15)" : "rgba(255,255,255,0.03)",
                      border: "2px solid",
                      borderColor: !barberId ? "var(--accent)" : "rgba(255,255,255,0.1)",
                      boxShadow: !barberId ? "0 0 20px rgba(245, 200, 66, 0.2)" : "none",
                      transition: "all 0.3s ease",
                      color: !barberId ? "var(--accent)" : "var(--muted)"
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <span style={{ 
                      fontSize: "0.7rem", 
                      fontWeight: 700, 
                      color: !barberId ? "var(--accent)" : "var(--muted)",
                      whiteSpace: "nowrap",
                      textTransform: "uppercase",
                      letterSpacing: "0.02em"
                    }}>Cualquiera</span>
                  </button>

                  {/* BARBER LIST */}
                  {barbers.length > 0 ? (
                    barbers.map((barber) => {
                      const active = barber.id === barberId;
                      const initials = barber.full_name.split(" ").map(n => n[0]).join("").slice(0, 2);
                      return (
                        <button
                          key={barber.id}
                          type="button"
                          onClick={() => {
                            setBarberId(barber.id);
                            setDemoConfirmation("");
                          }}
                          style={{
                            flexShrink: 0,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "10px",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            transition: "all 0.3s ease",
                            transform: active ? "scale(1.05)" : "scale(1)"
                          }}
                        >
                          <div style={{
                            width: "64px",
                            height: "64px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.1rem",
                            fontWeight: 800,
                            background: active ? "rgba(245, 200, 66, 0.15)" : "rgba(255,255,255,0.03)",
                            border: "2px solid",
                            borderColor: active ? "var(--accent)" : "rgba(255,255,255,0.1)",
                            boxShadow: active ? "0 0 20px rgba(245, 200, 66, 0.2)" : "none",
                            transition: "all 0.3s ease",
                            color: active ? "var(--accent)" : "var(--text)"
                          }}>
                            {initials}
                          </div>
                          <span style={{ 
                            fontSize: "0.75rem", 
                            fontWeight: 700, 
                            color: active ? "var(--accent)" : "var(--muted)",
                            whiteSpace: "nowrap"
                          }}>{barber.full_name.split(" ")[0]}</span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="stack" style={{ gap: 4, opacity: 0.5, padding: "20px 0" }}>
                      <small>No hay otros profesionales disponibles</small>
                      <small style={{ fontSize: "0.7rem" }}>para este servicio en esta fecha.</small>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* STEP 2: PROFESSIONAL & SLOT SELECTION (SLOTS) */}
            <div className="stack" style={{ gap: 20 }}>
              <div className="stack" style={{ gap: 6 }}>
                <span className="eyebrow" style={{ color: "var(--accent)", fontSize: "0.75rem", fontWeight: 800 }}>Horarios Disponibles</span>
              </div>

              <div 
                className="grid service-grid-mobile selection-grid" 
                style={{ 
                  gap: "10px", 
                  width: "100%" 
                }}
              >
                {availabilityLoading ? (
                  <div className="muted" style={{ gridColumn: "span 3", textAlign: "center", padding: "40px" }}>Buscando espacios...</div>
                ) : uniqueSlots.length > 0 ? (
                  uniqueSlots.map((slot) => {
                    const active = buildSlotId(slot.barberId, slot.start) === selectedSlotId;
                    return (
                      <button
                        key={buildSlotId(slot.barberId, slot.start)}
                        type="button"
                        onClick={() => handleSlotSelect(slot)}
                        style={{
                          height: "48px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "12px",
                          background: active ? "var(--accent)" : "rgba(255,255,255,0.03)",
                          border: "1px solid",
                          borderColor: active ? "var(--accent)" : "rgba(255,255,255,0.06)",
                          color: active ? "var(--bg)" : "var(--text)",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <strong style={{ fontSize: "0.95rem", letterSpacing: "0.02em" }}>
                          {formatHour(slot.start, timezone)}
                        </strong>
                        {!barberId && (
                          <span style={{ fontSize: "0.55rem", opacity: active ? 0.8 : 0.4, fontWeight: 700, textTransform: "uppercase" }}>
                            {slot.barberName.split(" ")[0]}
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="notice" style={{ gridColumn: "span 3", textAlign: "center", fontSize: "0.85rem", opacity: 0.7 }}>
                    {barberId
                      ? isTodaySelected
                        ? "Este barbero ya no tiene turnos disponibles hoy. En la zona horaria del local ya pasó el último horario posible para este servicio. Probá con otro profesional o elegí otra fecha."
                        : "Este barbero no tiene turnos disponibles para la fecha elegida. Probá con otro profesional o elegí otra fecha."
                      : isTodaySelected
                        ? "Hoy ya no quedan turnos disponibles. En la zona horaria del local ya pasó el último horario posible para este servicio. Probá con otra fecha."
                        : "No hay turnos disponibles para la fecha elegida. Por favor, seleccioná otra fecha."
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* STEP 3: PERSONAL DATA & CONFIRMATION */}
        <div ref={bindGuideSection("details", step3Ref)} className="stack" style={{ gap: 20, padding: "10px 0", borderTop: "1px solid var(--line)", scrollMarginTop: "140px" }}>
          <div className="stack" style={{ gap: 6 }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "white" }}>Finalizar Reserva</h2>
            <p className="muted" style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>Confirmá los detalles para asegurar tu lugar.</p>
          </div>

          <div className="stack" style={{ gap: 24, maxWidth: "700px", margin: "0 auto", width: "100%" }}>
            
            {/* TICKET SUMMARY (RESTORING ORIGINAL VERTICAL POSITION) */}
            <div className="summary-card" style={{ 
              background: "#161616", 
              border: "1px solid rgba(245, 200, 66, 0.3)", 
              padding: "18px 20px",
              borderRadius: "20px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
            }}>
              <span className="eyebrow" style={{ color: "var(--accent)", fontSize: "0.66rem", display: "block", marginBottom: "12px", letterSpacing: "0.08em", fontWeight: 900 }}>RESUMEN</span>
              
              <div className="stack" style={{ gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "5px" }}>
                  <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase" }}>Servicio</span>
                  <strong style={{ fontSize: "0.85rem", color: "white" }}>{selectedService?.name || "-"}</strong>
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "5px" }}>
                  <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase" }}>Profesional</span>
                  <strong style={{ fontSize: "0.85rem", color: "white" }}>{selectedSlot?.barberName || "-"}</strong>
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase" }}>Fecha y Hora</span>
                  <strong style={{ fontSize: "0.85rem", color: "var(--accent)" }}>
                    {selectedSlot ? formatDateTime(selectedSlot.start, timezone).replace(" ", " \u00B7 ") : "-"}
                  </strong>
                </div>
              </div>

              <div style={{ height: "1px", background: "rgba(245, 200, 66, 0.2)", margin: "14px 0 12px" }} />
              
              <div className="summary-row" style={{ justifyContent: "space-between", display: "flex", alignItems: "center", flexDirection: "row" }}>
                <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>TOTAL</span>
                <span className="price-tag" style={{ fontSize: "1.5rem", color: "var(--accent)", fontWeight: 900 }}>{selectedService ? formatCurrency(selectedService.price) : "-"}</span>
              </div>
            </div>

            {/* INPUTS SECTION */}
            <div className="stack" style={{ gap: 24 }}>
            {error && !hideErrors ? (
                <div className="notice error" style={{ fontSize: "0.85rem", padding: "12px", background: "rgba(255,100,100,0.1)", border: "1px solid #ff4444", borderRadius: "8px" }}>
                  <strong style={{ display: "block", marginBottom: validationIssues.length ? "8px" : 0 }}>{error}</strong>
                  {validationIssues.length ? (
                    <div className="stack" style={{ gap: 4 }}>
                      {validationIssues.map((issue) => <small key={issue} style={{ color: "#ffbaba", fontSize: "0.78rem" }}>- {issue}</small>)}
                    </div>
                  ) : null}
                </div>
              ) : null}
              
              <div className="stack" style={{ gap: "24px" }}>
                <div className="stack" style={{ gap: 14 }}>
                  <span className="eyebrow" style={{ color: "var(--accent)", fontSize: "0.72rem", fontWeight: 800 }}>Tus datos</span>
                  <div className="stack" style={{ gap: "24px", padding: "18px", borderRadius: "18px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="stack" style={{ gap: 10, flex: 1 }}>
                      <span className="eyebrow" style={{ color: "var(--accent)", fontSize: "0.75rem", fontWeight: 800 }}>Nombre completo</span>
                      <input 
                        value={name} 
                        onChange={(event) => setName(event.target.value)} 
                        placeholder="Tu nombre y apellido" 
                        style={{ 
                          padding: "16px", 
                          borderRadius: "12px", 
                          fontSize: "1rem",
                          background: "#1c1c1c",
                          border: "2px solid rgba(255,255,255,0.15)",
                          color: "#ffffff",
                          outline: "none",
                          width: "100%"
                        }} 
                      />
                      {fieldErrors.name ? <small style={{ color: "#ff8484", fontSize: "0.75rem", fontWeight: 600 }}>{fieldErrors.name}</small> : null}
                    </div>
                    
                    <div className="stack" style={{ gap: 10, flex: 1 }}>
                      <span className="eyebrow" style={{ color: "var(--accent)", fontSize: "0.75rem", fontWeight: 800 }}>WhatsApp</span>
                      <input 
                        value={phone} 
                        onChange={(event) => setPhone(event.target.value)} 
                        placeholder="Ej: 11 1234 5678" 
                        style={{ 
                          padding: "16px", 
                          borderRadius: "12px", 
                          fontSize: "1rem",
                          background: "#1c1c1c",
                          border: "2px solid rgba(255,255,255,0.15)",
                          color: "#ffffff",
                          outline: "none",
                          width: "100%"
                        }} 
                      />
                      {fieldErrors.phone ? <small style={{ color: "#ff8484", fontSize: "0.75rem", fontWeight: 600 }}>{fieldErrors.phone}</small> : null}
                    </div>
                  </div>
                </div>
              </div>

              <div ref={bindGuideSection("payment")} className="stack" style={{ gap: 14 }}>
                <span className="eyebrow" style={{ color: "var(--accent)", fontSize: "0.72rem", fontWeight: 800 }}>Pago</span>
                <div className="summary-card" style={{ gap: 10, padding: "18px", borderRadius: "18px" }}>
                  <span className="eyebrow" style={{ color: "var(--accent)", fontSize: "0.68rem", fontWeight: 800 }}>Forma de pago</span>
                  <div className="filter-row" style={{ flexWrap: "wrap", gap: 8, justifyContent: "center", width: "100%" }}>
                    {paymentSettings?.allowPayAtStore && (
                      <button type="button" className={`chip-button${paymentMethod === "pay_at_store" ? " active" : ""}`} onClick={() => {
                        setPaymentMethod("pay_at_store");
                        setDemoConfirmation("");
                        if (date === minDate) {
                          if (paymentNotice === payAtStoreOnlyTodayMessage) {
                            setPaymentNotice("");
                          }
                        } else {
                          setPaymentNotice(payAtStoreOnlyTodayMessage);
                          setValidationIssues([]);
                        }
                      }} style={{ minHeight: "42px", flex: 1 }}>Efectivo</button>
                    )}
                    {paymentSettings?.allowBankTransfer && (
                      <button type="button" className={`chip-button${paymentMethod === "bank_transfer" ? " active" : ""}`} onClick={() => {
                        setPaymentMethod("bank_transfer");
                        setDemoConfirmation("");
                        if (paymentNotice === payAtStoreOnlyTodayMessage) {
                          setPaymentNotice("");
                        }
                      }} style={{ minHeight: "42px", flex: 1 }}>Transferencia</button>
                    )}
                    {paymentSettings?.allowMercadoPago && (
                      <button type="button" className={`chip-button${paymentMethod === "mercado_pago" ? " active" : ""}`} onClick={() => {
                        setPaymentMethod("mercado_pago");
                        setDemoConfirmation("");
                        if (paymentNotice === payAtStoreOnlyTodayMessage) {
                          setPaymentNotice("");
                        }
                      }} style={{ minHeight: "42px", flex: 1 }}>Mercado Pago</button>
                    )}
                  </div>

                  {!paymentMethod ? <small className="muted" style={{ fontSize: "0.72rem" }}>Elegí una forma de pago para ver cuánto pagás ahora.</small> : null}
                  {isPayAtStore ? <small className="muted" style={{ fontSize: "0.72rem" }}>En efectivo no se cobra seña online y solo podés reservar turnos para hoy.</small> : null}
                  {paymentNotice ? (
                    <div className="notice" style={{ fontSize: "0.8rem", padding: "12px", background: "rgba(245,200,66,0.1)", border: "1px solid rgba(245,200,66,0.28)", borderRadius: "12px", color: "rgba(255,255,255,0.9)" }}>
                      {paymentNotice}
                    </div>
                  ) : null}
                  {isBankTransfer ? (
                    hasTransferDetails ? (
                      <div
                        className="stack"
                        style={{
                          gap: 12,
                          padding: "16px",
                          borderRadius: "16px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)"
                        }}
                      >
                        <div className="stack" style={{ gap: 4 }}>
                          <strong style={{ fontSize: "0.92rem", color: "white" }}>Datos para transferir</strong>
                          <small className="muted" style={{ fontSize: "0.74rem" }}>
                            Usá estos datos para enviar {paymentBreakdown ? formatCurrency(paymentBreakdown.amountRequiredNow) : "la seña"} y luego registramos tu reserva para validarla.
                          </small>
                        </div>

                        {paymentSettings?.transferAlias ? (
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                            <div className="stack" style={{ gap: 2 }}>
                              <small className="muted" style={{ fontSize: "0.68rem", textTransform: "uppercase" }}>Alias</small>
                              <strong style={{ fontSize: "0.86rem", color: "white", wordBreak: "break-word" }}>{paymentSettings.transferAlias}</strong>
                            </div>
                            <button type="button" className="btn-ghost" onClick={() => copyToClipboard(paymentSettings.transferAlias!, "Alias")} style={{ minWidth: "92px", padding: "0 12px", height: "38px" }}>
                              Copiar
                            </button>
                          </div>
                        ) : null}

                        {paymentSettings?.transferCbu ? (
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                            <div className="stack" style={{ gap: 2 }}>
                              <small className="muted" style={{ fontSize: "0.68rem", textTransform: "uppercase" }}>CBU / CVU</small>
                              <strong style={{ fontSize: "0.86rem", color: "white", wordBreak: "break-word" }}>{paymentSettings.transferCbu}</strong>
                            </div>
                            <button type="button" className="btn-ghost" onClick={() => copyToClipboard(paymentSettings.transferCbu!, "CBU")} style={{ minWidth: "92px", padding: "0 12px", height: "38px" }}>
                              Copiar
                            </button>
                          </div>
                        ) : null}

                        {paymentSettings?.transferHolderName ? (
                          <div className="stack" style={{ gap: 2 }}>
                            <small className="muted" style={{ fontSize: "0.68rem", textTransform: "uppercase" }}>Titular</small>
                            <strong style={{ fontSize: "0.86rem", color: "white" }}>{paymentSettings.transferHolderName}</strong>
                          </div>
                        ) : null}

                        {paymentSettings?.transferBankName ? (
                          <div className="stack" style={{ gap: 2 }}>
                            <small className="muted" style={{ fontSize: "0.68rem", textTransform: "uppercase" }}>Banco</small>
                            <strong style={{ fontSize: "0.86rem", color: "white" }}>{paymentSettings.transferBankName}</strong>
                          </div>
                        ) : null}

                        {copyFeedback ? (
                          <small style={{ color: "var(--accent)", fontSize: "0.74rem", fontWeight: 700 }}>{copyFeedback}</small>
                        ) : null}
                      </div>
                    ) : (
                      <div className="notice" style={{ fontSize: "0.8rem", padding: "12px", background: "rgba(255,170,64,0.08)", border: "1px solid rgba(255,170,64,0.24)", borderRadius: "12px", color: "rgba(255,255,255,0.9)" }}>
                        La transferencia está habilitada, pero faltan cargar los datos bancarios de la empresa para mostrarlos en esta pantalla.
                      </div>
                    )
                  ) : null}
                  {paymentBreakdown ? (
                    <div className="stack" style={{ gap: 6, paddingTop: "4px" }}>
                      <div className="summary-row" style={{ alignItems: "center", justifyContent: "space-between", gap: 10, flexDirection: "row" }}>
                        <small className="muted" style={{ fontSize: "0.72rem" }}>Total del servicio</small>
                        <strong style={{ fontSize: "0.8rem" }}>{selectedService ? formatCurrency(selectedService.price) : "-"}</strong>
                      </div>
                      <div className="summary-row" style={{ alignItems: "center", justifyContent: "space-between", gap: 10, flexDirection: "row" }}>
                        <small className="muted" style={{ fontSize: "0.72rem" }}>
                          {paymentBreakdown.amountRequiredNow > 0 && paymentBreakdown.amountRequiredNow < paymentBreakdown.totalAmount
                            ? "Seña a pagar ahora"
                            : paymentBreakdown.amountRequiredNow > 0
                              ? "Pago a realizar ahora"
                              : "Pagás hoy en el local"}
                        </small>
                        <strong style={{ fontSize: "0.8rem", color: "var(--accent)" }}>{formatCurrency(paymentBreakdown.amountRequiredNow)}</strong>
                      </div>
                      {paymentBreakdown.amountPendingAtStore > 0 ? (
                        <div className="summary-row" style={{ alignItems: "center", justifyContent: "space-between", gap: 10, flexDirection: "row" }}>
                          <small className="muted" style={{ fontSize: "0.72rem" }}>Saldo pendiente</small>
                          <strong style={{ fontSize: "0.8rem" }}>{formatCurrency(paymentBreakdown.amountPendingAtStore)}</strong>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            
            <div className="stack" style={{ gap: 14 }}>
               <button 
                className="btn" 
                type="button" 
                disabled={submitting || !selectedSlot || !selectedService || !paymentMethod || !paymentBreakdown} 
                onClick={handleSubmit}
                style={{ width: "100%", height: "56px", fontSize: "1.1rem", fontWeight: 800 }}
              >
                {submitting
                  ? "Procesando..."
                  : !paymentMethod
                    ? "Elegí una forma de pago"
                    : paymentMethod === "bank_transfer"
                      ? `${paymentBreakdown && paymentBreakdown.amountRequiredNow < paymentBreakdown.totalAmount ? "Registrar reserva y transferir seña de" : "Registrar reserva y transferir"} ${paymentBreakdown ? formatCurrency(paymentBreakdown.amountRequiredNow) : ""}`
                      : paymentMethod === "mercado_pago"
                        ? `${paymentBreakdown && paymentBreakdown.amountRequiredNow < paymentBreakdown.totalAmount ? "Pagar seña de" : "Pagar ahora"} ${paymentBreakdown ? formatCurrency(paymentBreakdown.amountRequiredNow) : ""}`
                        : `Confirmar reserva`}
              </button>
              
              {isPhoneDemo && demoConfirmation ? (
                <div className="notice" style={{ fontSize: "0.82rem", padding: "12px", background: "rgba(245,200,66,0.08)", border: "1px solid rgba(245,200,66,0.28)", borderRadius: "12px", color: "rgba(255,255,255,0.88)", textAlign: "center" }}>
                  {demoConfirmation}
                </div>
              ) : null}

              <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                <Link className="btn-ghost" href={`/${slug}`} style={{ border: "1px solid rgba(255,255,255,0.16)", opacity: 1, fontSize: "0.82rem", color: "rgba(255,255,255,0.88)", background: "rgba(255,255,255,0.04)", padding: "0 18px", width: "100%" }}>
                  Cancelar y volver
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}















































