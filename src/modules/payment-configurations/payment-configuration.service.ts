import { prisma } from "../../config/database";

interface CreateConfigInput {
  upiId: string;
  upiName: string;
  upiLink?: string;
  qrCodeUrl?: string;
  qrCodeId?: string;
  createdById: string;
}

export async function createConfiguration(data: CreateConfigInput) {
  return prisma.$transaction(async (tx) => {
    await tx.paymentConfiguration.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    return tx.paymentConfiguration.create({
      data: {
        upiId: data.upiId,
        upiName: data.upiName,
        upiLink: data.upiLink,
        qrCodeUrl: data.qrCodeUrl,
        qrCodeId: data.qrCodeId,
        createdById: data.createdById,
        isActive: true,
      },
    });
  });
}

export async function getActiveConfiguration() {
  return prisma.paymentConfiguration.findFirst({
    where: { isActive: true },
  });
}

export async function updateConfiguration(
  id: string,
  data: Partial<CreateConfigInput>,
) {
  const existing = await prisma.paymentConfiguration.findUnique({
    where: { id },
  });

  if (!existing) throw new Error("PAYMENT_CONFIG_NOT_FOUND");

  return prisma.paymentConfiguration.update({
    where: { id },
    data: {
      upiId: data.upiId,
      upiName: data.upiName,
      upiLink: data.upiLink,
      qrCodeUrl: data.qrCodeUrl,
      qrCodeId: data.qrCodeId,
    },
  });
}