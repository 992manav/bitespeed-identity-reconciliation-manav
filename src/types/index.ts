import { LinkPrecedence } from '@prisma/client';

export interface IdentifyRequest {
  email?: string;
  phoneNumber?: string;
}

export interface ContactResponse {
  primaryContactId: number;
  emails: string[];
  phoneNumbers: string[];
  secondaryContactIds: number[];
}

export interface IdentifyResponse {
  contact: ContactResponse;
}

export interface ContactData {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: LinkPrecedence;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
