export default function Menu({ setMode }) {
  return (
    <div className="flex flex-col gap-3">
      <button onClick={() => setMode("dashboard")} className="bg-sky-500 text-white px-4 py-2 rounded hover:bg-sky-600">Dashboard</button>
      <button onClick={() => setMode("read")} className="bg-sky-500 text-white px-4 py-2 rounded hover:bg-sky-600">Read Mode</button>
      <button onClick={() => setMode("low")} className="bg-sky-500 text-white px-4 py-2 rounded hover:bg-sky-600">Low Mastery</button>
    </div>
  );
}
