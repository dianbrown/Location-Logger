interface StatusPillProps {
  done: boolean;
}

export default function StatusPill({ done }: StatusPillProps) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
      done ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-800"
    }`}>
      {done ? "✅ Completed" : "⏳ Pending"}
    </span>
  );
}
