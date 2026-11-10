// Servicio de comunicación con API Backend y soporte de Fallback en LocalStorage

const API_BASE_URL = '/api';

// Simulación de almacenamiento en LocalStorage cuando el backend no responde
const STORAGE_KEY_TURNOS = 'peluqueria_turnos_local';
const STORAGE_KEY_CLIENTE = 'peluqueria_cliente_data';

function getLocalTurnos() {
  const data = localStorage.getItem(STORAGE_KEY_TURNOS);
  if (!data) {
    const defaultTurnos = [
      {
        id: 1,
        cliente_id: 1,
        nombre: 'Juan Pérez',
        telefono: '1122334455',
        email: 'juan@example.com',
        fecha_hora: new Date(Date.now() + 86400000).toISOString().slice(0, 16).replace('T', ' '),
        estado: 'Reservado',
        observaciones: 'Corte clásico de pelo y arreglo de barba'
      },
      {
        id: 2,
        cliente_id: 2,
        nombre: 'María Gómez',
        telefono: '1199887766',
        email: 'maria@example.com',
        fecha_hora: new Date(Date.now() + 172800000).toISOString().slice(0, 16).replace('T', ' '),
        estado: 'Confirmado',
        observaciones: 'Tinte completo y peinado'
      }
    ];
    localStorage.setItem(STORAGE_KEY_TURNOS, JSON.stringify(defaultTurnos));
    return defaultTurnos;
  }
  return JSON.parse(data);
}

function saveLocalTurnos(turnos) {
  localStorage.setItem(STORAGE_KEY_TURNOS, JSON.stringify(turnos));
}

export function getSavedClientData() {
  const data = localStorage.getItem(STORAGE_KEY_CLIENTE);
  return data ? JSON.parse(data) : { nombre: '', telefono: '', email: '' };
}

export function saveSavedClientData(client) {
  localStorage.setItem(STORAGE_KEY_CLIENTE, JSON.stringify(client));
}

// Obtener turnos
export async function fetchTurnos(estado) {
  try {
    const url = estado ? `${API_BASE_URL}/turnos?estado=${estado}` : `${API_BASE_URL}/turnos`;
    const response = await fetch(url);
    if (response.ok) {
      const result = await response.json();
      return result.data;
    }
  } catch (err) {
    console.warn('Backend API no disponible, usando LocalStorage fallback:', err);
  }

  // Fallback LocalStorage
  let turnos = getLocalTurnos();
  if (estado) {
    turnos = turnos.filter(t => t.estado === estado);
  }
  return turnos;
}

// Obtener horarios disponibles para una fecha
export async function fetchHorariosDisponibles(fecha) {
  try {
    const response = await fetch(`${API_BASE_URL}/turnos/disponibles?fecha=${fecha}`);
    if (response.ok) {
      const result = await response.json();
      return result.data;
    }
  } catch (err) {
    console.warn('Backend API no disponible para disponibles:', err);
  }

  // Fallback
  const standard = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  const turnos = getLocalTurnos();
  const ocupadas = turnos
    .filter(t => t.fecha_hora.startsWith(fecha) && t.estado !== 'Cancelado')
    .map(t => t.fecha_hora.slice(11, 16));

  return standard.filter(slot => !ocupadas.includes(slot));
}

// Crear turno (Cumple RN-09 y RN-05)
export async function createTurnoAPI(turnoData) {
  // Guardar datos en LocalStorage para autocompletar futuros turnos (RN-05)
  saveSavedClientData({
    nombre: turnoData.nombre,
    telefono: turnoData.telefono,
    email: turnoData.email
  });

  let response;
  try {
    response = await fetch(API_BASE_URL + '/turnos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(turnoData)
    });
  } catch (err) {
    console.warn('Backend API no disponible, ejecutando creación en LocalStorage:', err);
    response = null;
  }

  if (response) {
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Error al crear turno'
      };
    }
    return result;
  }

  // Fallback en LocalStorage
  const turnos = getLocalTurnos();
  const normalizedDateTime = turnoData.fecha_hora.replace('T', ' ').slice(0, 16);
  const occupied = turnos.some(turno =>
    turno.estado !== 'Cancelado' &&
    (turno.fecha_hora || '').replace('T', ' ').slice(0, 16) === normalizedDateTime
  );

  if (occupied) {
    return {
      success: false,
      message: 'El horario seleccionado ya ha sido reservado. Elegí otro horario.'
    };
  }

  const newTurno = {
    id: Date.now(),
    cliente_id: Date.now(),
    nombre: turnoData.nombre,
    telefono: turnoData.telefono,
    email: turnoData.email || '',
    fecha_hora: turnoData.fecha_hora,
    estado: turnoData.estado || 'Reservado',
    observaciones: turnoData.observaciones || ''
  };
  turnos.push(newTurno);
  saveLocalTurnos(turnos);

  return {
    success: true,
    data: newTurno,
    message: 'Turno reservado exitosamente (modo offline)'
  };
}

// Actualizar turno
export async function updateTurnoAPI(id, data) {
  try {
    const response = await fetch(`${API_BASE_URL}/turnos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('Backend API offline, actualizando LocalStorage:', err);
  }

  const turnos = getLocalTurnos();
  const idx = turnos.findIndex(t => t.id == id);
  if (idx !== -1) {
    turnos[idx] = { ...turnos[idx], ...data };
    saveLocalTurnos(turnos);
    return { success: true, message: 'Turno actualizado' };
  }
  return { success: false, message: 'Turno no encontrado' };
}

// Eliminar turno
export async function deleteTurnoAPI(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/turnos/${id}`, {
      method: 'DELETE'
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('Backend API offline, eliminando en LocalStorage:', err);
  }

  let turnos = getLocalTurnos();
  turnos = turnos.filter(t => t.id != id);
  saveLocalTurnos(turnos);
  return { success: true, message: 'Turno eliminado' };
}
