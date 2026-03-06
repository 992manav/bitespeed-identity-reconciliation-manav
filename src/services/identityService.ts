import prisma from '../config/database';
import { IdentifyRequest, ContactResponse, ContactData } from '../types';
import logger from '../utils/logger';

class IdentityService {
  async identify(request: IdentifyRequest): Promise<ContactResponse> {
    const email = request.email?.trim();
    const phoneNumber = request.phoneNumber?.trim();

    if (!email && !phoneNumber) {
      throw new Error('Either email or phoneNumber must be provided');
    }

    logger.debug('Identifying contact', { email, phoneNumber });

    const matchingContacts = await prisma.contact.findMany({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phoneNumber ? [{ phoneNumber }] : []),
        ],
        deletedAt: null,
      },
    });

    logger.debug('Found matching contacts', { count: matchingContacts.length });

    if (matchingContacts.length === 0) {
      return this.createPrimaryContact(email, phoneNumber);
    }

    const primaryContactIds = this.getPrimaryContactIds(matchingContacts);

    if (primaryContactIds.length === 0) {
      return this.createPrimaryContact(email, phoneNumber);
    }

    let finalPrimaryId: number;

    if (primaryContactIds.length === 1) {
      finalPrimaryId = primaryContactIds[0];
    } else {
      finalPrimaryId = await this.mergePrimaryContacts(primaryContactIds);
    }

    await this.createSecondaryIfNeeded(finalPrimaryId, email, phoneNumber);

    return this.buildContactResponse(finalPrimaryId);
  }

  private async createPrimaryContact(
    email?: string,
    phoneNumber?: string
  ): Promise<ContactResponse> {
    logger.info('Creating new primary contact', { email, phoneNumber });

    const newContact = await prisma.contact.create({
      data: {
        email: email || null,
        phoneNumber: phoneNumber || null,
        linkPrecedence: 'primary',
      },
    });

    logger.info('Primary contact created', { id: newContact.id });

    return {
      primaryContactId: newContact.id,
      emails: email ? [email] : [],
      phoneNumbers: phoneNumber ? [phoneNumber] : [],
      secondaryContactIds: [],
    };
  }

  private async mergePrimaryContacts(
    primaryIds: number[]
  ): Promise<number> {
    logger.info('Merging primary contacts', {
      primaryIds,
    });

    const primaryContacts = await prisma.contact.findMany({
      where: {
        id: {
          in: primaryIds,
        },
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (primaryContacts.length === 0) {
      throw new Error('No primary contacts found');
    }

    const oldestPrimary = primaryContacts[0];
    const secondaryPrimaries = primaryContacts.slice(1);
    const secondaryPrimaryIds = secondaryPrimaries.map((contact) => contact.id);

    for (const secondary of secondaryPrimaries) {
      await prisma.contact.update({
        where: { id: secondary.id },
        data: {
          linkedId: oldestPrimary.id,
          linkPrecedence: 'secondary',
          updatedAt: new Date(),
        },
      });

      logger.info('Converted primary to secondary', {
        id: secondary.id,
        linkedTo: oldestPrimary.id,
      });
    }

    if (secondaryPrimaryIds.length > 0) {
      await prisma.contact.updateMany({
        where: {
          linkedId: {
            in: secondaryPrimaryIds,
          },
          deletedAt: null,
        },
        data: {
          linkedId: oldestPrimary.id,
        },
      });
    }

    return oldestPrimary.id;
  }

  private async createSecondaryIfNeeded(
    primaryId: number,
    email?: string,
    phoneNumber?: string
  ): Promise<void> {
    const allContacts = await prisma.contact.findMany({
      where: {
        OR: [{ id: primaryId }, { linkedId: primaryId }],
        deletedAt: null,
      },
    });

    const emailExists = email
      ? allContacts.some((contact) => contact.email === email)
      : true;
    const phoneExists = phoneNumber
      ? allContacts.some((contact) => contact.phoneNumber === phoneNumber)
      : true;

    const shouldCreateSecondary =
      (email ? !emailExists : false) || (phoneNumber ? !phoneExists : false);

    if (!shouldCreateSecondary) {
      return;
    }

    await prisma.contact.create({
      data: {
        email: email || null,
        phoneNumber: phoneNumber || null,
        linkedId: primaryId,
        linkPrecedence: 'secondary',
      },
    });
  }

  private getPrimaryContactIds(contacts: ContactData[]): number[] {
    const primaryIds = new Set<number>();

    for (const contact of contacts) {
      if (contact.linkPrecedence === 'primary') {
        primaryIds.add(contact.id);
      } else if (contact.linkedId) {
        primaryIds.add(contact.linkedId);
      }
    }

    return Array.from(primaryIds);
  }

  private async buildContactResponse(
    primaryId: number
  ): Promise<ContactResponse> {
    const allContacts = await prisma.contact.findMany({
      where: {
        OR: [{ id: primaryId }, { linkedId: primaryId }],
        deletedAt: null,
      },
    });

    const emails = new Set<string>();
    const phoneNumbers = new Set<string>();
    const secondaryIds: number[] = [];

    for (const contact of allContacts) {
      if (contact.email) {
        emails.add(contact.email);
      }
      if (contact.phoneNumber) {
        phoneNumbers.add(contact.phoneNumber);
      }
      if (contact.linkPrecedence === 'secondary') {
        secondaryIds.push(contact.id);
      }
    }

    return {
      primaryContactId: primaryId,
      emails: Array.from(emails).sort(),
      phoneNumbers: Array.from(phoneNumbers).sort(),
      secondaryContactIds: secondaryIds.sort((a, b) => a - b),
    };
  }
}

export default new IdentityService();
