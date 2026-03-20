export type Vehicle = {
  licensePlate: string; // ทะเบียนรถ เช่น "69-3320", "700-4900"
  vehicleType: string;  // ประเภทรถ เช่น "6W", "10W", "Prime Mover", "4W"
  engineType: string;   // ประเภทเครื่องยนต์ "ICE", "EV"
  branch: string;       // สาขาที่ปฏิบัติการ "KSN", "CHO", "AYA", "BBT", "RA2"
};

export const MOCK_VEHICLES: Vehicle[] = [
  { licensePlate: "69-3320", vehicleType: "6W", engineType: "ICE", branch: "KSN" },
  { licensePlate: "700-4900", vehicleType: "10W", engineType: "ICE", branch: "CHO" },
  { licensePlate: "3กฒ-7788", vehicleType: "Prime Mover", engineType: "ICE", branch: "AYA" },
  { licensePlate: "5กค-1122", vehicleType: "4W", engineType: "EV", branch: "BBT" },
  { licensePlate: "8ผฉ-3344", vehicleType: "6W", engineType: "ICE", branch: "RA2" },
  { licensePlate: "2ชม-5566", vehicleType: "10W", engineType: "ICE", branch: "KSN" },
  { licensePlate: "1กท-9900", vehicleType: "Prime Mover", engineType: "EV", branch: "CHO" },
  { licensePlate: "ฮย-1234", vehicleType: "4W", engineType: "ICE", branch: "AYA" },
];
