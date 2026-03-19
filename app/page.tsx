import { GanttChart } from "@/components/GanttChart";

const vehicles = [
  "กข 1234 กรุงเทพมหานคร",
  "1กท 4567 กรุงเทพมหานคร",
  "ฮย 9081 เชียงใหม่",
  "บม 7788 ขอนแก่น",
  "2ฒฉ 1122 ชลบุรี",
  "ผย 3344 นครราชสีมา",
  "3กศ 5566 ระยอง",
  "นข 9900 สุราษฎร์ธานี"
];

export default function Home() {
  return (
    <main className="page-shell">
      <GanttChart vehicles={vehicles} />
    </main>
  );
}