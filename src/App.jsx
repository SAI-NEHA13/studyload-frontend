import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://localhost:8081/api/tasks";

const EMPTY_FORM = {
  title: "",
  type: "Assignment",
  deadline: "",
  estimatedHours: "",
  difficulty: "Medium",
};

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [dailyStudyHours, setDailyStudyHours] = useState(3);
  const [showStudyPlan, setShowStudyPlan] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // LOAD TASKS
  const loadTasks = async () => {
    try {
      const response = await axios.get(API_URL);
      setTasks(response.data);
    } catch (error) {
      console.error("Error loading tasks:", error);
      alert("Could not load tasks. Check whether the backend is running.");
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // HANDLE FORM CHANGES
  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  // CANCEL EDITING
  const cancelEdit = () => {
    setEditingTaskId(null);
    setForm({ ...EMPTY_FORM });
  };

  // ADD OR UPDATE TASK
  const saveTask = async (event) => {
    event.preventDefault();

    if (
      !form.title.trim() ||
      !form.deadline ||
      !form.estimatedHours ||
      Number(form.estimatedHours) < 1
    ) {
      alert("Enter a task name, deadline, and valid study hours.");
      return;
    }

    setLoading(true);

    const taskData = {
      title: form.title.trim(),
      type: form.type,
      deadline: form.deadline,
      estimatedHours: Number(form.estimatedHours),
      difficulty: form.difficulty,
    };

    try {
      if (editingTaskId !== null) {
        await axios.put(`${API_URL}/${editingTaskId}`, taskData);
        alert("Task updated successfully!");
      } else {
        await axios.post(API_URL, taskData);
        alert("Task added successfully!");
      }

      setForm({ ...EMPTY_FORM });
      setEditingTaskId(null);
      setShowStudyPlan(false);
      await loadTasks();
    } catch (error) {
      console.error("Error saving task:", error);
      alert(
        editingTaskId !== null
          ? "Could not update task. Check the backend update endpoint."
          : "Could not add task. Please check the backend."
      );
    } finally {
      setLoading(false);
    }
  };

  // EDIT TASK: FILL FORM WITH EXISTING DETAILS
  const editTask = (task) => {
    setEditingTaskId(task.id);
    setForm({
      title: task.title || "",
      type: task.type || "Assignment",
      deadline: task.deadline || "",
      estimatedHours: String(task.estimatedHours ?? ""),
      difficulty: task.difficulty || "Medium",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // DELETE TASK
  const deleteTask = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/${id}`);

      if (editingTaskId === id) {
        cancelEdit();
      }

      setShowStudyPlan(false);
      await loadTasks();
      alert("Task deleted successfully!");
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Could not delete task. Please check the backend.");
    }
  };

  // SORT TASKS BY PRIORITY
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityDifference =
      Number(b.priorityScore ?? 0) - Number(a.priorityScore ?? 0);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return new Date(a.deadline) - new Date(b.deadline);
  });

  // DASHBOARD STATISTICS
  const totalHours = tasks.reduce(
    (sum, task) => sum + Number(task.estimatedHours || 0),
    0
  );

  const highPriorityTasks = tasks.filter(
    (task) => task.priorityLevel === "HIGH"
  ).length;

  const assignmentCount = tasks.filter(
    (task) => task.type === "Assignment"
  ).length;

  const examCount = tasks.filter(
    (task) => task.type === "Exam"
  ).length;

  const projectCount = tasks.filter(
    (task) => task.type === "Project"
  ).length;

  const overdueCount = tasks.filter(
    (task) => task.deadlineStatus === "OVERDUE"
  ).length;

  // WORKLOAD ANALYSIS
  let workloadLevel = "Low";
  let workloadMessage =
    "Your academic workload is currently manageable.";

  if (totalHours > 20) {
    workloadLevel = "High";
    workloadMessage =
      "Your workload is high. Divide large tasks into smaller study sessions and start with urgent work.";
  } else if (totalHours > 10) {
    workloadLevel = "Moderate";
    workloadMessage =
      "Your workload is moderate. Follow a daily study plan to avoid deadline pressure.";
  }

  // SMART RECOMMENDATION
  const recommendedTask = sortedTasks[0] || null;

  let recommendation =
    "Add academic tasks to receive a personalized priority recommendation.";

  if (recommendedTask) {
    if (recommendedTask.deadlineStatus === "OVERDUE") {
      recommendation =
        `Prioritize "${recommendedTask.title}" because its deadline has passed. ` +
        `It has a priority score of ${recommendedTask.priorityScore}/100.`;
    } else if (recommendedTask.deadlineStatus === "DUE TODAY") {
      recommendation =
        `"${recommendedTask.title}" is due today. Complete it as soon as possible. ` +
        `Its priority score is ${recommendedTask.priorityScore}/100.`;
    } else {
      recommendation =
        `Start with "${recommendedTask.title}". It has ${recommendedTask.priorityLevel} priority, ` +
        `a score of ${recommendedTask.priorityScore}/100, and a deadline of ${recommendedTask.deadline}.`;
    }
  }

  // AUTOMATIC STUDY PLAN
  const generateStudyPlan = () => {
    const plan = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dayOffset = 0;
    let hoursLeft = Number(dailyStudyHours);

    sortedTasks.forEach((task) => {
      let remainingHours = Number(task.estimatedHours) || 0;

      while (remainingHours > 0) {
        const studyDate = new Date(today);
        studyDate.setDate(today.getDate() + dayOffset);

        const year = studyDate.getFullYear();
        const month = String(studyDate.getMonth() + 1).padStart(2, "0");
        const day = String(studyDate.getDate()).padStart(2, "0");
        const dateKey = `${year}-${month}-${day}`;

        let entry = plan.find((item) => item.date === dateKey);

        if (!entry) {
          entry = { date: dateKey, tasks: [], totalHours: 0 };
          plan.push(entry);
        }

        const allocatedHours = Math.min(remainingHours, hoursLeft);

        entry.tasks.push({
          title: task.title,
          hours: allocatedHours,
          deadline: task.deadline,
        });

        entry.totalHours += allocatedHours;
        remainingHours -= allocatedHours;
        hoursLeft -= allocatedHours;

        if (hoursLeft <= 0) {
          dayOffset++;
          hoursLeft = Number(dailyStudyHours);
        }
      }
    });

    return plan;
  };

  const studyPlan = generateStudyPlan();

  const getStatusClass = (status) =>
    (status || "UNKNOWN").toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <div>
          <h1>📚 StudyLoad</h1>
          <p>
            Intelligent Academic Workload Analysis & Scheduling System
          </p>
        </div>
      </header>

      {/* DASHBOARD STATISTICS */}
      <section className="stats">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div>
            <h3>Total Tasks</h3>
            <strong>{tasks.length}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div>
            <h3>Total Study Hours</h3>
            <strong>{totalHours} hrs</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div>
            <h3>High Priority</h3>
            <strong>{highPriorityTasks}</strong>
          </div>
        </div>
      </section>

      <main className="main-content">
        {/* ADD / EDIT TASK FORM */}
        <section className="card" id="task-form">
          <h2>
            {editingTaskId !== null
              ? "✏️ Edit Academic Task"
              : "➕ Add Academic Task"}
          </h2>

          <p className="subtitle">
            {editingTaskId !== null
              ? "Update the task details and save your changes."
              : "Add assignments, exams and projects to manage your workload."}
          </p>

          <form onSubmit={saveTask} className="task-form">
            <div className="form-group">
              <label>Task Name *</label>
              <input
                type="text"
                name="title"
                placeholder="Example: DBMS Assignment"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Task Type</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
              >
                <option>Assignment</option>
                <option>Exam</option>
                <option>Project</option>
                <option>Lab Work</option>
                <option>Presentation</option>
              </select>
            </div>

            <div className="form-group">
              <label>Deadline *</label>
              <input
                type="date"
                name="deadline"
                value={form.deadline}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Estimated Hours *</label>
              <input
                type="number"
                name="estimatedHours"
                min="1"
                step="1"
                placeholder="Example: 4"
                value={form.estimatedHours}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Difficulty</label>
              <select
                name="difficulty"
                value={form.difficulty}
                onChange={handleChange}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>

            <button
              type="submit"
              className="add-button"
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : editingTaskId !== null
                  ? "💾 Save Changes"
                  : "+ Add Task"}
            </button>

            {editingTaskId !== null && (
              <button
                type="button"
                className="delete-button"
                onClick={cancelEdit}
                disabled={loading}
              >
                Cancel Edit
              </button>
            )}
          </form>
        </section>

        {/* ACADEMIC TASKS */}
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>📚 My Academic Tasks</h2>
              <p className="subtitle">
                Tasks stored in your StudyLoad database, ranked by priority.
              </p>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📭</div>
              <h3>No tasks yet</h3>
              <p>Add your first academic task above.</p>
            </div>
          ) : (
            <div className="task-list">
              {sortedTasks.map((task) => (
                <div className="task-item" key={task.id}>
                  <div className="task-info">
                    <h3>{task.title}</h3>

                    <div className="task-details">
                      <span>📌 {task.type}</span>
                      <span>📅 {task.deadline}</span>
                      <span>⏱️ {task.estimatedHours} hrs</span>
                    </div>

                    <div className="priority-details">
                      <span className="priority-score">
                        🎯 Priority Score: {task.priorityScore ?? "N/A"}/100
                      </span>

                      <span
                        className={`priority-badge ${(task.priorityLevel || "LOW").toLowerCase()}`}
                      >
                        {task.priorityLevel || "UNRANKED"}
                      </span>
                    </div>

                    <div className="deadline-details">
                      <span
                        className={`deadline-badge ${getStatusClass(task.deadlineStatus)}`}
                      >
                        {task.deadlineStatus || "STATUS UNKNOWN"}
                      </span>
                    </div>
                  </div>

                  <div className="task-actions">
                    <div
                      className={`difficulty ${(task.difficulty || "medium").toLowerCase()}`}
                    >
                      {task.difficulty}
                    </div>

                    <button
                      type="button"
                      className="add-button"
                      onClick={() => editTask(task)}
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => deleteTask(task.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* WORKLOAD ANALYSIS */}
        <section className="card analysis-card">
          <h2>📊 Workload Analysis</h2>
          <p className="subtitle">
            Automatic analysis of your current academic workload.
          </p>

          <div className="analysis-grid">
            <div className="analysis-box">
              <span>📚 Assignments</span>
              <strong>{assignmentCount}</strong>
            </div>

            <div className="analysis-box">
              <span>📝 Exams</span>
              <strong>{examCount}</strong>
            </div>

            <div className="analysis-box">
              <span>💻 Projects</span>
              <strong>{projectCount}</strong>
            </div>

            <div className="analysis-box">
              <span>⏱️ Study Hours</span>
              <strong>{totalHours} hrs</strong>
            </div>

            <div className="analysis-box">
              <span>🚨 Overdue Tasks</span>
              <strong>{overdueCount}</strong>
            </div>

            <div className="analysis-box">
              <span>🔥 High Priority</span>
              <strong>{highPriorityTasks}</strong>
            </div>
          </div>

          <div className={`workload-status ${workloadLevel.toLowerCase()}`}>
            <strong>Current Workload: {workloadLevel}</strong>
            <p>{workloadMessage}</p>
          </div>
        </section>

        {/* AUTOMATIC STUDY PLANNER */}
        <section className="card">
          <h2>🗓️ Automatic Study Planner</h2>
          <p className="subtitle">
            Generate a study schedule based on task priority and available hours.
          </p>

          <div className="form-group">
            <label>Available Study Hours Per Day</label>
            <select
              value={dailyStudyHours}
              onChange={(event) => {
                setDailyStudyHours(Number(event.target.value));
                setShowStudyPlan(false);
              }}
            >
              <option value={1}>1 hour</option>
              <option value={2}>2 hours</option>
              <option value={3}>3 hours</option>
              <option value={4}>4 hours</option>
              <option value={5}>5 hours</option>
              <option value={6}>6 hours</option>
              <option value={8}>8 hours</option>
            </select>
          </div>

          <button
            type="button"
            className="add-button"
            onClick={() => setShowStudyPlan(true)}
          >
            📅 Generate My Study Plan
          </button>

          {showStudyPlan && (
            <div style={{ marginTop: "24px" }}>
              {studyPlan.length === 0 ? (
                <p>Add academic tasks to generate your study plan.</p>
              ) : (
                studyPlan.map((day) => (
                  <div
                    key={day.date}
                    style={{
                      padding: "16px",
                      marginBottom: "12px",
                      border: "1px solid #e0e7ff",
                      borderRadius: "12px",
                      background: "#f8faff",
                    }}
                  >
                    <h3>📆 {day.date}</h3>
                    <p>
                      Planned study time: <strong>{day.totalHours} hours</strong>
                    </p>

                    {day.tasks.map((item, index) => (
                      <p key={`${item.title}-${index}`}>
                        📚 <strong>{item.title}</strong> — {item.hours} hour(s)
                        <br />
                        <span style={{ color: "#64748b" }}>
                          Deadline: {item.deadline}
                        </span>
                      </p>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* SMART RECOMMENDATION */}
        <section className="recommendation">
          <div className="recommendation-icon">💡</div>
          <div>
            <h2>Smart Recommendation</h2>
            <p>{recommendation}</p>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer>
        <p>StudyLoad © 2026 | Intelligent Academic Planning System</p>
      </footer>
    </div>
  );
}

export default App;