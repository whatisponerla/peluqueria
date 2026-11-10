import React from 'react';
import { MoreHorizontal } from 'lucide-react';

function getDate(value) {
  const date = new Date((value || '').replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function TurnoCard({ turno, onClick }) {
  const date = getDate(turno.fecha_hora);
  const time = date
    ? new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(date)
    : '';
  const service = (turno.observaciones || '').replace(/^Servicio:\s*/i, '') || 'Servicio a confirmar';

  return (
    <button className="turno-card" type="button" onClick={() => onClick(turno)}>
      <span className="client-avatar" aria-hidden="true" />
      <span className="turno-info">
        <strong className="turno-cliente">{turno.nombre}</strong>
        <span className="turno-service">{service}</span>
      </span>
      <span className="turno-card-side">
        <span className="turno-time">{time}</span>
        <MoreHorizontal size={18} aria-hidden="true" />
      </span>
    </button>
  );
}
