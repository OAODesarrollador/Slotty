"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { PhoneReveal } from "@/components/phone-reveal";
import { QuickBookingFlow, type BookingGuideStep } from "@/components/quick-booking-flow";
import sectionStyles from "@/app/page.module.css";
import styles from "./how-it-works-showcase.module.css";

const STEP_COPY: Array<{ step: BookingGuideStep; id: string; title: string; body: string }> = [
  {
    step: "service",
    id: "01",
    title: "Elegí el servicio",
    body: "El cliente selecciona qué quiere reservar en pocos segundos."
  },
  {
    step: "schedule",
    id: "02",
    title: "Seleccioná horario",
    body: "El sistema muestra disponibilidad real para avanzar sin fricción."
  },
  {
    step: "details",
    id: "03",
    title: "Completá tus datos",
    body: "La reserva se confirma con un flujo simple y claro."
  },
  {
    step: "payment",
    id: "04",
    title: "Elegí cómo pagar",
    body: "El cliente puede avanzar hasta la forma de pago desde el mismo recorrido."
  }
];

type HowItWorksShowcaseProps = {
  today: string;
};

export function HowItWorksShowcase({ today }: HowItWorksShowcaseProps) {
  const [activeStep, setActiveStep] = useState<BookingGuideStep>("service");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sectionNodesRef = useRef<Partial<Record<BookingGuideStep, HTMLDivElement | null>>>({});
  const syncingRef = useRef(false);

  const activeContent = useMemo(
    () => STEP_COPY.find((item) => item.step === activeStep) ?? STEP_COPY[0],
    [activeStep]
  );

  const registerSection = (step: BookingGuideStep, node: HTMLDivElement | null) => {
    sectionNodesRef.current[step] = node;
  };

  const scrollToStep = (step: BookingGuideStep) => {
    const scrollable = scrollContainerRef.current;
    const node = sectionNodesRef.current[step];
    if (!scrollable || !node) {
      setActiveStep(step);
      return;
    }

    syncingRef.current = true;
    setActiveStep(step);
    const nextTop = Math.max(0, node.offsetTop - 12);
    scrollable.scrollTo({ top: nextTop, behavior: "smooth" });
    window.setTimeout(() => {
      syncingRef.current = false;
    }, 450);
  };

  useEffect(() => {
    const scrollable = scrollContainerRef.current;
    if (!scrollable) {
      return;
    }

    const handleScroll = () => {
      if (syncingRef.current) {
        return;
      }

      const marker = scrollable.scrollTop + scrollable.clientHeight * 0.35;
      let nextStep: BookingGuideStep = "service";

      for (const item of STEP_COPY) {
        const node = sectionNodesRef.current[item.step];
        if (node && node.offsetTop <= marker) {
          nextStep = item.step;
        }
      }

      setActiveStep((current) => (current === nextStep ? current : nextStep));
    };

    handleScroll();
    scrollable.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollable.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section id="demo" className={styles.section} data-animate>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={sectionStyles.tagline}>CÓMO FUNCIONA</span>
          <h2 className={sectionStyles.serifTitle}>Así reservan tus clientes</h2>
          <p className={sectionStyles.impactSubtitle} style={{ textAlign: "left", margin: "24px 0 0", maxWidth: "760px" }}>
            Explorá el flujo completo en segundos y descubrí por qué Slotty es la mejor opción para tu negocio.
          </p>
        </div>

        <div className={styles.layout}>
          <div className={styles.controlPanel}>
            <div className={styles.stepperCard}>
              <div className={styles.stepperHeader}>
                <span className={styles.stepperKicker}>Recorrido guiado</span>
                <p className={styles.stepperIntro}>
                  Un sistema pensado para ordenar tu agenda, adaptarse a tu forma de trabajo y mostrar todo con claridad.
                </p>
              </div>

              <div className={styles.stepList}>
                {STEP_COPY.map((item) => {
                  const isActive = item.step === activeStep;
                  return (
                    <button
                      key={item.step}
                      type="button"
                      className={`${styles.stepButton} ${isActive ? styles.stepButtonActive : ""}`}
                      onClick={() => scrollToStep(item.step)}
                      aria-pressed={isActive}
                    >
                      <span className={styles.stepId}>{item.id}</span>
                      <span className={styles.stepContent}>
                        <strong>{item.title}</strong>
                        <span>{item.body}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className={styles.activeExplanation}>
                <span className={styles.activeLabel}>Paso activo</span>
                <strong>{activeContent.title}</strong>
                <p>{activeContent.body}</p>
              </div>
            </div>
          </div>

          <div className={styles.phoneColumn}>
            <div className={styles.phoneShell}>
              <div className={styles.phoneCaption}>
                <span className={styles.liveDot} />
                Demo real del flujo dentro del teléfono
              </div>
              <PhoneReveal onScrollContainerReady={(node) => {
                scrollContainerRef.current = node;
              }}>
                <QuickBookingFlow
                  slug="root"
                  tenantName="Slotty Demo"
                  timezone="UTC"
                  minDate={today}
                  initialDate={today}
                  services={[
                    { id: "s1", name: "Corte", price: "8000", duration_minutes: 30, description: "" },
                    { id: "s2", name: "Barba", price: "5000", duration_minutes: 20, description: "" },
                    { id: "s3", name: "Corte + Barba", price: "12000", duration_minutes: 50, description: "" },
                    { id: "s4", name: "Express", price: "4500", duration_minutes: 15, description: "" }
                  ]}
                  barbersByService={{
                    s1: [{ id: "b1", full_name: "Alex Pro", rating: "5.0" }, { id: "b2", full_name: "Julian Cuts", rating: "4.9" }],
                    s2: [{ id: "b1", full_name: "Alex Pro", rating: "5.0" }],
                    s3: [{ id: "b1", full_name: "Alex Pro", rating: "5.0" }, { id: "b2", full_name: "Julian Cuts", rating: "4.9" }],
                    s4: [{ id: "b3", full_name: "Maria Nails", rating: "5.0" }]
                  }}
                  paymentSettings={{
                    allowPayAtStore: true,
                    allowBankTransfer: true,
                    allowMercadoPago: true,
                    depositType: "none",
                    depositValue: "0",
                    transferAlias: "SLOTTY.DEMO",
                    transferCbu: "00000031000987654321",
                    transferHolderName: "Slotty Software Inc",
                    transferBankName: "Banco de la Nación Argentina"
                  }}
                  hideErrors={true}
                  onGuideSectionMount={registerSection}
                />
              </PhoneReveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
