export type UserRole = 'president' | 'director' | 'member';

export interface Motorcycle {
  make: string;
  model: string;
  year: string;
  color: string;
  plate: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  nick: string;
  email: string;
  role: UserRole | string;
  phone: string;
  landlinePhone?: string;
  address: string;
  bloodType: string;
  emergencyContacts: EmergencyContact[];
  photoURL?: string;
  isBlocked?: boolean;
  motorcycle: Motorcycle;
  createdAt: string;
}

export interface Ride {
  id: string;
  title: string;
  destination: string;
  date: string;
  meetingPoint: string;
  locationPhone?: string;
  instagram?: string;
  departureTime: string;
  arrivalTime: string;
  createdBy: string;
  participants: Array<
    | string
    | {
        uid: string;
        name: string;
        motorcycle?: string;
      }
  >;
  status: 'planned' | 'ongoing' | 'completed';
}

export interface Emergency {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  status: 'active' | 'resolved';
  responders: Array<{
    uid: string;
    name: string;
    motorcycle?: string;
    acceptedAt: string;
  }>;
  timestamp: string;
}

export interface Store {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  instagram?: string;
  logoUrl?: string;
  createdAt: string;
}
