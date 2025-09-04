interface StatusPillProps {
  done: boolean;
}

export default function StatusPill({ done }: StatusPillProps) {
  return (
    <span className={`inline-block rounded px-2 py-1 text-xs ${
      done ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-800"
    }`}>
      {done ? "Done ✅" : "Pending"}
    </span>
  );
}
