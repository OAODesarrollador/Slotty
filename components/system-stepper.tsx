"use client";

import { useState } from "react";
import styles from "./system-stepper.module.css";

type Step = {
  id: string;
  title: string;
  body: string;
  eyebrow: string;
};

const STEPS: Step[] = [
  {
    id: "01",
    eyebrow: "Paso 1",
    title: "Servicios con tiempos reales",
    body: "Cada servicio define su propia duración para que la agenda se organice sola, sin cálculos manuales ni errores."
  },
  {
    id: "02",
    eyebrow: "Paso 2",
    title: "Disponibilidad por barbero",
    body: "Cada profesional maneja sus horarios y el sistema muestra disponibilidad real sin cruces ni confusiones."
  },
  {
    id: "03",
    eyebrow: "Paso 3",
    title: "Turnos inmediatos y walk-ins",
    body: "Cuando llega un cliente sin reserva, el sistema puede asignarlo según el primer espacio disponible."
  },
  {
    id: "04",
    eyebrow: "Paso 4",
    title: "Cobros adaptados a tu negocio",
    body: "Podés trabajar con seña, pago total o cobro en el local, según cómo funcione tu barbería."
  }
];

export function SystemStepper() {
  const [activeStep, setActiveStep] = useState(0);
  const current = STEPS[activeStep];

  return (
    <div className={styles.wrapper}>
      <div className={styles.stepsColumn}>
        {STEPS.map((step, index) => {
          const isActive = index === activeStep;
          return (
            <button
              key={step.id}
              type="button"
              className={`${styles.stepButton} ${isActive ? styles.stepButtonActive : ""}`}
              onClick={() => setActiveStep(index)}
              onMouseEnter={() => setActiveStep(index)}
              aria-pressed={isActive}
            >
              <span className={styles.stepNumber}>{step.id}</span>
              <span className={styles.stepTextWrap}>
                <span className={styles.stepEyebrow}>{step.eyebrow}</span>
                <span className={styles.stepTitle}>{step.title}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.previewColumn}>
        <div key={current.id} className={styles.previewCard}>
          <div className={styles.previewHeader}>
            <span className={styles.previewEyebrow}>{current.eyebrow}</span>
            <h3 className={styles.previewTitle}>{current.title}</h3>
            <p className={styles.previewBody}>{current.body}</p>
          </div>

          <div className={styles.mockFrame}>
            {activeStep === 0 ? <ServicesMock /> : null}
            {activeStep === 1 ? <AvailabilityMock /> : null}
            {activeStep === 2 ? <WalkInMock /> : null}
            {activeStep === 3 ? <PaymentsMock /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ServicesMock() {
  return (
    <div className={styles.mockStack}>
      <div className={styles.mockToolbar}>
        <span>Servicios</span>
        <span>Duración</span>
      </div>
      <div className={styles.serviceList}>
        <div className={styles.serviceRow}>
          <div>
            <strong>Corte clásico</strong>
            <small>Agenda precisa</small>
          </div>
          <span className={styles.timePill}>30 min</span>
        </div>
        <div className={styles.serviceRow}>
          <div>
            <strong>Barba</strong>
            <small>Bloque corto</small>
          </div>
          <span className={styles.timePill}>20 min</span>
        </div>
        <div className={styles.serviceRow}>
          <div>
            <strong>Corte + barba</strong>
            <small>Servicio combinado</small>
          </div>
          <span className={styles.timePill}>50 min</span>
        </div>
      </div>
    </div>
  );
}

function AvailabilityMock() {
  return (
    <div className={styles.mockStack}>
      <div className={styles.availabilityTopRow}>
        <div className={styles.barberCard}>
          <strong>Lucas</strong>
          <small>09:00 a 18:00</small>
          <div className={styles.slotDots}>
            <span className={styles.dotOn} />
            <span className={styles.dotOn} />
            <span className={styles.dotOff} />
            <span className={styles.dotOn} />
          </div>
        </div>
        <div className={styles.barberCard}>
          <strong>Mateo</strong>
          <small>10:00 a 20:00</small>
          <div className={styles.slotDots}>
            <span className={styles.dotOn} />
            <span className={styles.dotOff} />
            <span className={styles.dotOn} />
            <span className={styles.dotOn} />
          </div>
        </div>
      </div>
      <div className={styles.scheduleGrid}>
        <span>11:00</span>
        <span className={styles.available}>Libre</span>
        <span>12:30</span>
        <span className={styles.busy}>Ocupado</span>
        <span>14:00</span>
        <span className={styles.available}>Libre</span>
      </div>
    </div>
  );
}

function WalkInMock() {
  return (
    <div className={styles.mockStack}>
      <div className={styles.walkInBanner}>
        <strong>Cliente sin turno</strong>
        <span>Asignando primer espacio disponible</span>
      </div>
      <div className={styles.flowRow}>
        <div className={styles.flowBox}>Ingreso</div>
        <div className={styles.flowArrow} />
        <div className={styles.flowBoxActive}>Lucas 15:20</div>
        <div className={styles.flowArrow} />
        <div className={styles.flowBox}>Confirmado</div>
      </div>
      <div className={styles.noticeRow}>
        <span className={styles.noticeBadge}>Auto</span>
        <p>El sistema eligió el hueco más cercano sin cortar la agenda.</p>
      </div>
    </div>
  );
}

function PaymentsMock() {
  return (
    <div className={styles.mockStack}>
      <div className={styles.paymentSummary}>
        <div>
          <small>Total servicio</small>
          <strong>$12.000</strong>
        </div>
        <div>
          <small>Pagás ahora</small>
          <strong>$3.000</strong>
        </div>
      </div>
      <div className={styles.paymentOptions}>
        <button type="button" className={`${styles.optionChip} ${styles.optionChipActive}`}>Seña</button>
        <button type="button" className={styles.optionChip}>Pago total</button>
        <button type="button" className={styles.optionChip}>En el local</button>
      </div>
      <div className={styles.confirmationCard}>
        <span>Cobro configurado</span>
        <strong>Reserva lista para confirmar</strong>
      </div>
    </div>
  );
}
