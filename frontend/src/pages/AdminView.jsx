import React, { useEffect, useMemo, useState } from 'react';
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Plus,
  QrCode,
} from 'lucide-react';
import { createTurnoAPI, deleteTurnoAPI, fetchTurnos, updateTurnoAPI } from '../services/api';
import TurnoCard from '../components/TurnoCard';
import TurnoModal from '../components/TurnoModal';
import DatePickerModal from '../components/DatePickerModal';

function dateKey(value) {
  if (!value) return '';
  return value.slice(0, 10);
}

function parseDateTime(value) {
  const parsed = new Date((value || '').replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function todayString() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
}

function getTime(value) {
  const date = parseDateTime(value);
  return date ? new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(date) : '';
}

function getService(observations) {
  if (!observations) return 'Servicio a confirmar';
  return observations.replace(/^Servicio:\s*/i, '');
}

export default function AdminView({
  activeTab,
  setActiveTab,
  setUnapprovedCount,
  onExit
}) {
  const [turnos, setTurnos] = useState([]);
  const [selectedTurno, setSelectedTurno] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newTurno, setNewTurno] = useState({
    nombre: '',
    telefono: '',
    email: '',
    estado: 'Confirmado'
  });
  const [service, setService] = useState('');
  const [selectedDateTime, setSelectedDateTime] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const today = todayString();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchTurnos();
      const safeData = Array.isArray(data) ? data : [];
      setTurnos(safeData);
      setUnapprovedCount(safeData.filter(turno => turno.estado === 'Reservado').length);
    } catch (error) {
      setTurnos([]);
      setMsg({ type: 'error', text: 'No pudimos cargar la agenda.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const todaysTurnos = useMemo(
    () => turnos.filter(turno => dateKey(turno.fecha_hora) === today && turno.estado !== 'Cancelado'),
    [turnos, today]
  );
  const pendingTurnos = useMemo(
    () => turnos.filter(turno => turno.estado === 'Reservado'),
    [turnos]
  );
  const approvedCount = todaysTurnos.filter(turno => turno.estado !== 'Reservado').length;
  const pendingTodayCount = todaysTurnos.filter(turno => turno.estado === 'Reservado').length;
  const currentDate = new Date();
  const dateLabel = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(currentDate);
  const shortDateLabel = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(currentDate);

  const handleUpdateStatus = async (id, newStatus) => {
    await updateTurnoAPI(id, { estado: newStatus });
    setSelectedTurno(null);
    await loadData();
  };

  const handleModify = async (id, data) => {
    await updateTurnoAPI(id, data);
    setSelectedTurno(null);
    await loadData();
  };

  const handleDelete = async id => {
    await deleteTurnoAPI(id);
    setSelectedTurno(null);
    await loadData();
  };

  const handleCreateAdminTurno = async event => {
    event.preventDefault();
    if (!selectedDateTime) {
      setMsg({ type: 'error', text: 'Elegí una fecha y un horario para guardar el turno.' });
      return;
    }

    const observations = service.trim() ? 'Servicio: ' + service.trim() : '';
    const result = await createTurnoAPI({
      ...newTurno,
      observaciones: observations,
      fecha_hora: selectedDateTime
    });

    if (result.success) {
      setMsg({ type: 'success', text: 'Turno guardado en la agenda.' });
      setNewTurno({ nombre: '', telefono: '', email: '', estado: 'Confirmado' });
      setService('');
      setSelectedDateTime('');
      await loadData();
      setActiveTab('todos');
    } else {
      setMsg({ type: 'error', text: result.message || 'No se pudo guardar el turno.' });
    }
  };

  const openDashboard = () => setActiveTab('dashboard');
  const openToday = () => setActiveTab('todos');
  const openPending = () => setActiveTab('pendientes');

  return (
    <main className="barberia-screen admin-screen">
      {activeTab === 'dashboard' ? (
        <>
          <header className="admin-dashboard-header">
            <div>
              <h1>Gibbons</h1>
              <p>Panel de administración</p>
            </div>
            <button className="quiet-admin-link" type="button" onClick={onExit}>Salir</button>
          </header>

          <section className="dashboard-intro">
            <p className="today-kicker">{dateLabel}</p>
            <h2>Tu día, de un vistazo</h2>
          </section>

          <section className="today-summary-card">
            <div className="summary-card-copy">
              <p>Turnos para hoy</p>
              <strong>{loading ? '…' : todaysTurnos.length + ' turnos'}</strong>
            </div>
            <CalendarCheck size={30} strokeWidth={1.5} />
            <button type="button" onClick={openToday}>
              <ArrowRight size={17} /> Ver turnos del día
            </button>
          </section>

          <button className="admin-create-button" type="button" onClick={() => setActiveTab('crear')}>
            <Plus size={19} /> Crear nuevo turno
          </button>

          <button className="dashboard-pending-card" type="button" onClick={openPending}>
            <span className="dashboard-icon warm"><AlarmClock size={20} /></span>
            <span className="dashboard-card-copy">
              <strong>{loading ? 'Cargando turnos' : pendingTurnos.length + ' turnos por aprobar'}</strong>
              <small>Revisá las solicitudes nuevas</small>
            </span>
            <ChevronRight size={20} />
          </button>

          <button className="dashboard-qr-card" type="button" onClick={onExit}>
            <QrCode size={34} strokeWidth={1.4} />
            <span className="dashboard-card-copy">
              <strong>Compartí tu código QR</strong>
              <small>Tus clientes podrán reservar en segundos</small>
            </span>
          </button>
        </>
      ) : activeTab === 'todos' ? (
        <>
          <header className="screen-title-row">
            <button className="round-back-button" type="button" onClick={openDashboard} aria-label="Volver">
              <ArrowLeft size={19} />
            </button>
            <div>
              <h1>Turnos de hoy</h1>
              <p>{shortDateLabel}</p>
            </div>
          </header>

          <div className="appointment-tabs">
            <button className="appointment-tab active" type="button">
              Aprobados · {approvedCount}
            </button>
            <button className="appointment-tab" type="button" onClick={openPending}>
              Sin aprobar · {pendingTodayCount}
            </button>
          </div>

          {loading ? (
            <p className="empty-state">Cargando turnos…</p>
          ) : todaysTurnos.length === 0 ? (
            <p className="empty-state">No hay turnos para hoy.</p>
          ) : (
            <div className="barberia-appointments">
              {todaysTurnos.filter(turno => turno.estado !== 'Reservado').map(turno => (
                <TurnoCard key={turno.id} turno={turno} onClick={setSelectedTurno} />
              ))}
              {todaysTurnos.every(turno => turno.estado === 'Reservado') && (
                <p className="empty-state">Todos los turnos de hoy esperan aprobación.</p>
              )}
            </div>
          )}
        </>
      ) : activeTab === 'pendientes' ? (
        <>
          <header className="screen-title-row">
            <button className="round-back-button" type="button" onClick={openDashboard} aria-label="Volver">
              <ArrowLeft size={19} />
            </button>
            <div>
              <h1>Sin aprobar</h1>
              <p>{pendingTurnos.length} solicitudes pendientes</p>
            </div>
          </header>

          <div className="pending-notice">
            Confirmá los turnos para reservar esos horarios en tu agenda.
          </div>

          {loading ? (
            <p className="empty-state">Cargando solicitudes…</p>
          ) : pendingTurnos.length === 0 ? (
            <p className="empty-state">No hay solicitudes pendientes.</p>
          ) : (
            <div className="pending-list">
              {pendingTurnos.map(turno => (
                <article className="pending-card" key={turno.id}>
                  <div className="pending-client-row">
                    <span className="client-avatar" aria-hidden="true" />
                    <div className="pending-client-copy">
                      <strong>{turno.nombre}</strong>
                      <span>{getService(turno.observaciones)}</span>
                    </div>
                    <span className="pending-time">{getTime(turno.fecha_hora)}</span>
                  </div>
                  <div className="pending-decision-row">
                    <button type="button" className="reject-button" onClick={() => handleUpdateStatus(turno.id, 'Cancelado')}>
                      Rechazar
                    </button>
                    <button type="button" className="approve-button" onClick={() => handleUpdateStatus(turno.id, 'Confirmado')}>
                      Aprobar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <header className="screen-title-row">
            <button className="round-back-button" type="button" onClick={openDashboard} aria-label="Volver">
              <ArrowLeft size={19} />
            </button>
            <div>
              <h1>Nuevo turno</h1>
              <p>Completá los datos de la reserva</p>
            </div>
          </header>

          {msg.text && <div className={'form-alert ' + msg.type} role="status">{msg.text}</div>}

          <form className="admin-create-form" onSubmit={handleCreateAdminTurno}>
            <div className="design-field">
              <label htmlFor="admin-name">Nombre del cliente</label>
              <input
                id="admin-name"
                value={newTurno.nombre}
                onChange={event => setNewTurno({ ...newTurno, nombre: event.target.value })}
                required
              />
            </div>
            <div className="design-field">
              <label htmlFor="admin-phone">Teléfono</label>
              <input
                id="admin-phone"
                type="tel"
                inputMode="tel"
                value={newTurno.telefono}
                onChange={event => setNewTurno({ ...newTurno, telefono: event.target.value })}
                required
              />
            </div>
            <div className="design-field">
              <label htmlFor="admin-service">Servicio</label>
              <input
                id="admin-service"
                value={service}
                onChange={event => setService(event.target.value)}
                placeholder="Escribí el servicio"
              />
            </div>
            <div className="design-field">
              <label>Fecha</label>
              <button className="design-input-button" type="button" onClick={() => setIsDatePickerOpen(true)}>
                <span>{selectedDateTime ? new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(parseDateTime(selectedDateTime)) : 'Seleccionar fecha'}</span>
                <CalendarDays size={18} />
              </button>
            </div>
            <div className="design-field">
              <label>Hora disponible</label>
              <button className="design-input-button" type="button" onClick={() => setIsDatePickerOpen(true)}>
                <span>{selectedDateTime ? getTime(selectedDateTime) : 'Seleccionar hora'}</span>
                <Clock3 size={18} />
              </button>
            </div>
            <div className="create-state-field">
              <label htmlFor="admin-status">Estado inicial</label>
              <select
                id="admin-status"
                value={newTurno.estado}
                onChange={event => setNewTurno({ ...newTurno, estado: event.target.value })}
              >
                <option value="Confirmado">Aprobado</option>
                <option value="Reservado">Sin aprobar</option>
              </select>
            </div>
            <button className="design-primary-button" type="submit">
              <Check size={17} /> Guardar turno
            </button>
          </form>
        </>
      )}

      {selectedTurno && (
        <TurnoModal
          turno={selectedTurno}
          onClose={() => setSelectedTurno(null)}
          onUpdateStatus={handleUpdateStatus}
          onModify={handleModify}
          onDelete={handleDelete}
        />
      )}

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSelectDateTime={value => setSelectedDateTime(value)}
      />
    </main>
  );
}
