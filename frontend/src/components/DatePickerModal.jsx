import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { fetchHorariosDisponibles } from '../services/api';

const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function makeCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();
  const days = [];

  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - firstWeekday + 1;
    if (dayNumber < 1) {
      const day = previousMonthDays + dayNumber;
      const date = new Date(year, month - 1, day);
      days.push({ date, day, outside: true });
    } else if (dayNumber > daysInMonth) {
      const day = dayNumber - daysInMonth;
      const date = new Date(year, month + 1, day);
      days.push({ date, day, outside: true });
    } else {
      days.push({ date: new Date(year, month, dayNumber), day: dayNumber, outside: false });
    }
  }
  return days;
}

export default function DatePickerModal({ isOpen, onClose, onSelectDateTime }) {
  const [fecha, setFecha] = useState(localDateString(new Date()));
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const today = startOfDay(new Date());

  const monthLabel = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric'
  }).format(visibleMonth);
  const calendarDays = useMemo(() => makeCalendarDays(visibleMonth), [visibleMonth]);

  useEffect(() => {
    if (!isOpen || !fecha) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    fetchHorariosDisponibles(fecha)
      .then(data => {
        if (!active) return;
        const now = new Date();
        const available = fecha === localDateString(now)
          ? data.filter(time => {
            const [hour, minute] = time.split(':').map(Number);
            return hour * 60 + minute > now.getHours() * 60 + now.getMinutes();
          })
          : data;
        setHorarios(available);
      })
      .catch(() => {
        if (active) {
          setHorarios([]);
          setError('No pudimos cargar los horarios. Intentá de nuevo.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [fecha, isOpen]);

  if (!isOpen) return null;

  const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoPrevious = visibleMonth > todayMonth;
  const selectDate = date => {
    const nextDate = localDateString(date);
    if (date.getMonth() !== visibleMonth.getMonth() || date.getFullYear() !== visibleMonth.getFullYear()) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    setFecha(nextDate);
  };
  const chooseTime = time => {
    onSelectDateTime(fecha + ' ' + time);
    onClose();
  };

  return (
    <div className="barberia-picker-backdrop" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="barberia-picker" role="dialog" aria-modal="true" aria-labelledby="picker-title">
        <header className="picker-heading">
          <button className="round-back-button" type="button" onClick={onClose} aria-label="Volver">
            <ArrowLeft size={19} />
          </button>
          <div>
            <h2 id="picker-title">Fecha y hora</h2>
            <p>Elegí un horario disponible</p>
          </div>
        </header>

        <div className="calendar-card">
          <div className="calendar-month">
            <button
              type="button"
              onClick={() => canGoPrevious && setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
              disabled={!canGoPrevious}
              aria-label="Mes anterior"
            >
              <ChevronLeft size={19} />
            </button>
            <strong>{monthLabel.charAt(0).toLocaleUpperCase('es-AR') + monthLabel.slice(1)}</strong>
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
              aria-label="Mes siguiente"
            >
              <ChevronRight size={19} />
            </button>
          </div>

          <div className="calendar-grid calendar-weekdays">
            {weekdays.map((day, index) => <span key={day + index}>{day}</span>)}
          </div>
          <div className="calendar-grid">
            {calendarDays.map(({ date, day, outside }) => {
              const isPast = startOfDay(date) < today;
              const isSelected = localDateString(date) === fecha;
              return (
                <button
                  key={localDateString(date)}
                  className={'calendar-day' + (outside ? ' outside-month' : '') + (isSelected ? ' selected' : '')}
                  type="button"
                  disabled={isPast}
                  onClick={() => selectDate(date)}
                  aria-pressed={isSelected}
                  aria-label={new Intl.DateTimeFormat('es-AR', { dateStyle: 'full' }).format(date)}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        <div className="available-times">
          <div className="available-times-heading">
            <h3>Horarios disponibles</h3>
            <span>{new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(new Date(fecha + 'T12:00:00'))}</span>
          </div>
          {loading ? (
            <p className="picker-empty">Cargando horarios…</p>
          ) : error ? (
            <p className="picker-empty" role="alert">{error}</p>
          ) : horarios.length === 0 ? (
            <p className="picker-empty">No hay horarios libres ese día. Elegí otra fecha.</p>
          ) : (
            <div className="picker-time-grid">
              {horarios.map(time => (
                <button className="picker-time" key={time} type="button" onClick={() => chooseTime(time)}>
                  <Clock3 size={14} /> {time}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="picker-other-day" type="button" onClick={() => {
          const now = new Date();
          setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
          setFecha(localDateString(now));
        }}>
          <ArrowLeft size={17} /> Elegir otro día
        </button>
      </section>
    </div>
  );
}
