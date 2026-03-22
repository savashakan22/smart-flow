export type Device = {
  id: string;
  name: string;
  location: string;
  serial: string;
  status: "Online" | "Offline";
  wifiSsid?: string;
  wifiPassword?: string;
};

export const devices: Device[] = [
  {
    id: "device-a",
    name: "Device A",
    location: "House",
    serial: "SM-1001",
    status: "Online",
    wifiSsid: "Home WiFi",
    wifiPassword: "********",
  },
  {
    id: "device-b",
    name: "Device B",
    location: "Balcony",
    serial: "TM-2088",
    status: "Online",
    wifiSsid: "Balcony Net",
    wifiPassword: "********",
  },
  {
    id: "device-c",
    name: "Device C",
    location: "School",
    serial: "SR-3099",
    status: "Offline",
    wifiSsid: "Campus IoT",
    wifiPassword: "********",
  },
];