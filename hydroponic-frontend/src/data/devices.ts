export type Device = {
  id: string;
  name: string;
  location: string;
  serial: string;
  status: "Online" | "Offline";
};

export const devices: Device[] = [];

export function mapDeviceIdToCard(deviceId: string): Device {
  return {
    id: deviceId,
    serial: deviceId,
    name: deviceId,
    location: "Connected device",
    status: "Online",
  };
}
