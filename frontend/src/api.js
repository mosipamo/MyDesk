const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // notes
  listNotes: () => request("/notes"),
  createNote: (data) => request("/notes", { method: "POST", body: JSON.stringify(data) }),
  updateNote: (id, data) => request(`/notes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteNote: (id) => request(`/notes/${id}`, { method: "DELETE" }),

  // todos
  listTodos: () => request("/todos"),
  createTodo: (data) => request("/todos", { method: "POST", body: JSON.stringify(data) }),
  updateTodo: (id, data) => request(`/todos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTodo: (id) => request(`/todos/${id}`, { method: "DELETE" }),

  // events
  listEvents: (start, end) => {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    const qs = params.toString();
    return request(`/events${qs ? `?${qs}` : ""}`);
  },
  createEvent: (data) => request("/events", { method: "POST", body: JSON.stringify(data) }),
  updateEvent: (id, data) => request(`/events/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteEvent: (id) => request(`/events/${id}`, { method: "DELETE" }),

  // drawings
  listDrawings: () => request("/drawings"),
  getDrawing: (id) => request(`/drawings/${id}`),
  createDrawing: (data) => request("/drawings", { method: "POST", body: JSON.stringify(data) }),
  updateDrawing: (id, data) => request(`/drawings/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteDrawing: (id) => request(`/drawings/${id}`, { method: "DELETE" }),
};
