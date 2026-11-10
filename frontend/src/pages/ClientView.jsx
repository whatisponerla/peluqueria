import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CalendarCheck,
  ChevronDown,
  Clock3,
  Scissors
} from 'lucide-react';
import { createTurnoAPI, getSavedClientData } from '../services/api';
import DatePickerModal from '../components/DatePickerModal';

function parseLocalDateTime(value) {
  if (!value) return null;
  const normalized = value.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseLocalDateTime(value);
  if (!date) return value || 'A confirmar';
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(date);
}

function formatTime(value) {
  const date = parseLocalDateTime(value);
  return date
    ? new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(date)
    : 'A confirmar';
}

function getServiceLabel(observaciones) {
  if (!observaciones) return 'A confirmar';
  return observaciones.replace(/^Servicio:\s*/i, '');
}

export default function ClientView({ onAdminClick }) {
  const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '' });
  const [service, setService] = useState('');
  const [selectedDateTime, setSelectedDateTime] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [submittedTurno, setSubmittedTurno] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const saved = getSavedClientData();
    setFormData(previous => ({
      ...previous,
      nombre: saved.nombre || '',
      telefono: saved.telefono || '',
      email: saved.email || ''
    }));
  }, []);

  const handleChange = event => {
    setFormData(previous => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (!selectedDateTime) {
      setErrorMsg('Elegí una fecha y un horario para continuar.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const observations = service.trim() ? 'Servicio: ' + service.trim() : '';
      const result = await createTurnoAPI({
        ...formData,
        observaciones: observations,
        fecha_hora: selectedDateTime
      });

      if (result.success) {
        setSubmittedTurno(result.data);
      } else {
        setErrorMsg(result.message || 'No pudimos reservar ese horario. Elegí otro.');
      }
    } catch (error) {
      setErrorMsg(error.message || 'No pudimos conectar con la barbería. Intentá nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetBooking = () => {
    setSubmittedTurno(null);
    setSelectedDateTime('');
    setService('');
    setErrorMsg('');
  };

  return (
    <main className="barberia-screen booking-screen">
      <header className="brand-header">
        <div className="brand-lockup">
          <span className="brand-mark"><Scissors size={20} strokeWidth={1.8} /></span>
          <div>
            <div className="brand-name">Gibbons</div>
            <div className="brand-subtitle">Barberia</div>
          </div>
        </div>
        <button className="quiet-admin-link" type="button" onClick={onAdminClick}>
          Panel
        </button>
      </header>

      {submittedTurno ? (
        <section className="booking-confirmation" aria-live="polite">
          <div className="confirmation-icon"><CalendarCheck size={26} strokeWidth={1.7} /></div>
          <h1>Tu Solicitud está lista</h1>
          <p className="confirmation-caption">Revisá los datos</p>

          <div className="summary-card">
            <h2>Resumen del turno</h2>
            <dl className="summary-list">
              <div><dt>Fecha</dt><dd>{formatDate(submittedTurno.fecha_hora)}</dd></div>
              <div><dt>Hora</dt><dd>{formatTime(submittedTurno.fecha_hora)}</dd></div>
              <div><dt>Servicio</dt><dd>{getServiceLabel(submittedTurno.observaciones)}</dd></div>
              <div><dt>Precio</dt><dd>A confirmar</dd></div>
            </dl>
            <p className="price-note">La barbería confirmará el precio. No se realizó ningún pago.</p>
          </div>

          <button className="text-action" type="button" onClick={resetBooking}>
            <ArrowRight size={17} /> Reservar otro turno
          </button>
        </section>
      ) : (
        <section className="booking-content">
          <div className="booking-heading">
            <h1>Reservá tu turno</h1>
            <p>Elegí el servicio y el horario que mejor te quede.</p>
          </div>

          {errorMsg && <div className="form-alert" role="alert">{errorMsg}</div>}

          <form className="booking-form" onSubmit={handleSubmit}>
            <div className="design-field">
              <label htmlFor="client-name">Nombre</label>
              <input
                id="client-name"
                name="nombre"
                autoComplete="name"
                placeholder="Tu nombre y apellido"
                value={formData.nombre}
                onChange={handleChange}
                required
              />
            </div>

            <div className="design-field">
              <label htmlFor="client-phone">Teléfono</label>
              <input
                id="client-phone"
                name="telefono"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="Tu número de contacto"
                value={formData.telefono}
                onChange={handleChange}
                required
              />
            </div>

            <div className="design-field">
              <label htmlFor="client-service">Servicio deseado</label>
              <div className="field-with-icon">
                <input
                  id="client-service"
                  value={service}
                  onChange={event => setService(event.target.value)}
                  placeholder="Contanos qué servicio buscás"
                  aria-label="Servicio deseado"
                />
                <ChevronDown size={18} aria-hidden="true" />
              </div>
            </div>

            <div className="design-field">
              <label htmlFor="client-date">Fecha</label>
              <button
                id="client-date"
                className="design-input-button"
                type="button"
                onClick={() => setIsDatePickerOpen(true)}
              >
                <span>{selectedDateTime ? formatDate(selectedDateTime) : 'Seleccionar fecha'}</span>
                <CalendarDays size={18} />
              </button>
            </div>

            <div className="design-field">
              <label htmlFor="client-time">Hora disponible</label>
              <button
                id="client-time"
                className="design-input-button"
                type="button"
                onClick={() => setIsDatePickerOpen(true)}
              >
                <span>{selectedDateTime ? formatTime(selectedDateTime) : 'Seleccionar hora'}</span>
                <Clock3 size={18} />
              </button>
            </div>

            <button className="design-primary-button" type="submit" disabled={isSubmitting}>
              <CalendarCheck size={17} />
              {isSubmitting ? 'Procesando…' : 'Reservar turno'}
            </button>
          </form>
        </section>
      )}

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSelectDateTime={dateTime => setSelectedDateTime(dateTime)}
      />
    </main>
  );
}
