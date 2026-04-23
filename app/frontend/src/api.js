const configuredApiUrl = (import.meta.env.VITE_API_URL || '').trim();

export const API_URL = configuredApiUrl || '/api';
export const API_DISPLAY_URL = API_URL.startsWith('/')
  ? `${API_URL} (route Ingress / Traefik)`
  : API_URL;

const parseJson = async (response) => {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Unexpected API error');
  }

  return payload;
};

export const fetchTasks = async () => {
  const res = await fetch(`${API_URL}/tasks`);
  return parseJson(res);
};

export const fetchApiInfo = async () => {
  const res = await fetch(`${API_URL}/info`);
  return parseJson(res);
};

export const createTask = async (taskData, file) => {
  const formData = new FormData();
  formData.append('title', taskData.title);
  formData.append('description', taskData.description);
  if (file) {
    formData.append('image', file); // On attache le fichier
  }

  const res = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    body: formData,
  });
  return parseJson(res);
};

export const completeTask = async (id) => {
  const res = await fetch(`${API_URL}/tasks/${id}/complete`, { method: 'PUT' });
  return parseJson(res);
};

export const deleteTask = async (id) => {
  const res = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || 'Unexpected API error');
  }
};