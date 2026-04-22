type Props = {
  title: string;
  value: string;
};

export default function MetricCard({ title, value }: Props) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200">
      <p className="text-2xl font-bold text-gray-900 font-syne">{value}</p>
      <p className="text-sm text-gray-500">{title}</p>
    </div>
  );
}