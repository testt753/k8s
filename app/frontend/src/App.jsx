import { useEffect, useState } from 'react';
import {
  fetchTasks,
  fetchApiInfo,
  createTask,
  completeTask,
  deleteTask,
  API_URL,
  API_DISPLAY_URL,
} from './api';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [apiInfo, setApiInfo] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);

  const appVariant = import.meta.env.VITE_APP_VARIANT || 'stable';
  const isCanary = appVariant === 'canary';
  const variantTitle = isCanary ? 'Canary preview' : 'Stable release';
  const variantDescription = isCanary
    ? 'Variante canary avec accent plus visible pour rendre le split A/B demonstrable.'
    : 'Version stable destinee au trafic principal de la demo.';

  const loadTasks = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [taskList, info] = await Promise.all([fetchTasks(), fetchApiInfo()]);
      setTasks(taskList);
      setApiInfo(info);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await createTask({ title, description }, file);
      setTitle('');
      setDescription('');
      setFile(null);
      await loadTasks();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async (id) => {
    setError('');

    try {
      await completeTask(id);
      await loadTasks();
    } catch (actionError) {
      setError(actionError.message);
    }
  };

  const handleDelete = async (id) => {
    setError('');

    try {
      await deleteTask(id);
      await loadTasks();
    } catch (actionError) {
      setError(actionError.message);
    }
  };

  return (
    <div className={`container ${isCanary ? 'variant-canary' : 'variant-stable'}`}>
      <div className="hero">
        <div>
          <p className="eyebrow">{isCanary ? 'Kubernetes Canary Preview' : 'Kubernetes Stable Release'}</p>
          <h1>Task Manager</h1>
          <p className="hero-copy">
            Frontend React, backend Express et PostgreSQL. Cette version est prete pour
            le deploiement multi-replicas, l'observabilite et les demonstrations A/B.
          </p>
        </div>
        <div className="hero-badges">
          <span className="badge badge-variant">Frontend {appVariant}</span>
          <span className="badge">API {apiInfo?.version || 'n/a'} / {apiInfo?.imageTag || 'n/a'}</span>
        </div>
      </div>

      <div className={`variant-note ${isCanary ? 'is-canary' : 'is-stable'}`}>
        <strong>{variantTitle}</strong>
        <span>{variantDescription}</span>
      </div>

      {error && <div className="alert">{error}</div>}

      <form onSubmit={handleAdd} className="task-form">
        <input
          type="text" placeholder="Nouvelle tâche..."
          value={title} onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="text" placeholder="Description..."
          value={description} onChange={(e) => setDescription(e.target.value)}
        />
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Ajout...' : 'Ajouter'}
        </button>
      </form>

      <div className="meta-panel">
        <div>
          <span className="meta-label">API URL</span>
          <strong>{API_DISPLAY_URL}</strong>
        </div>
        <div>
          <span className="meta-label">Environnement</span>
          <strong>{apiInfo?.environment || 'n/a'}</strong>
        </div>
        <div>
          <span className="meta-label">Base de donnees</span>
          <strong>{apiInfo?.dbReady ? 'Ready' : 'Warmup / non ready'}</strong>
        </div>
        <div>
          <span className="meta-label">Stockage uploads</span>
          <strong>{apiInfo?.storageMode || 'n/a'}</strong>
        </div>
      </div>

      <ul className="task-list">
        {isLoading && <li className="empty-state">Chargement des tâches...</li>}
        {!isLoading && tasks.length === 0 && (
          <li className="empty-state">Aucune tâche pour le moment.</li>
        )}
        {tasks.map(task => (
          <li key={task.id} className={task.status === 'completed' ? 'done' : ''}>
            <div className="task-content">
              <strong>{task.title}</strong>
              <p>{task.description || 'Sans description'}</p>
              <span className="task-status">{task.status}</span>
            </div>
            {task.image_url && (
              <img
                src={`${API_URL}/uploads/${task.image_url}`}
                alt="Pièce jointe"
                className="task-image"
              />
            )}
            <div className="actions">
              {task.status !== 'completed' && (
                <button onClick={() => handleComplete(task.id)}>✔</button>
              )}
              <button onClick={() => handleDelete(task.id)} className="delete">🗑</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;