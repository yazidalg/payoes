import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getMembershipForUser } from "@/lib/organizations/members";
import {
  getOrganizationById,
  updateOrganization,
} from "@/lib/organizations/service";
import { uploadOrganizationLogo } from "@/lib/storage/minio";

const organizationSchema = z.object({
  name: z.string().min(1, "Business name is required").max(120),
  email: z.string().email("Business email must be valid"),
  website: z
    .string()
    .max(200)
    .refine(
      (value) => !value || /^https?:\/\/.+/i.test(value),
      "Website must be a valid URL"
    )
    .optional()
    .or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await getMembershipForUser(id, session.user.id);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organization = await getOrganizationById(id);

  if (!organization) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    organization,
    viewerRole: membership.role,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const membership = await getMembershipForUser(id, session.user.id);

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const parsed = organizationSchema.safeParse({
        name: formData.get("name"),
        email: formData.get("email"),
        website: formData.get("website") || undefined,
        description: formData.get("description") || undefined,
      });

      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Invalid request" },
          { status: 400 }
        );
      }

      const existing = await getOrganizationById(id);

      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      let logoUrl = existing.logoUrl;
      const logoFile = formData.get("logo");

      if (logoFile instanceof File && logoFile.size > 0) {
        const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];

        if (!allowedTypes.includes(logoFile.type)) {
          return NextResponse.json(
            { error: "Logo must be a PNG, JPG, WEBP, or GIF image" },
            { status: 400 }
          );
        }

        if (logoFile.size > 2 * 1024 * 1024) {
          return NextResponse.json(
            { error: "Logo must be smaller than 2 MB" },
            { status: 400 }
          );
        }

        logoUrl = await uploadOrganizationLogo(logoFile, id);
      }

      const organization = await updateOrganization(id, {
        name: parsed.data.name,
        email: parsed.data.email,
        website: parsed.data.website || null,
        description: parsed.data.description || null,
        logoUrl,
      });

      return NextResponse.json({ organization });
    }

    const body = await request.json();
    const parsed = organizationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const existing = await getOrganizationById(id);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const organization = await updateOrganization(id, {
      name: parsed.data.name,
      email: parsed.data.email,
      website: parsed.data.website || null,
      description: parsed.data.description || null,
      logoUrl: existing.logoUrl,
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Update organization failed:", error);
    return NextResponse.json({ error: "Unable to update organization" }, { status: 500 });
  }
}
