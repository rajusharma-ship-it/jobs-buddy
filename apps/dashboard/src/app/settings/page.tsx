"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/utils";
import type { Profile } from "@jobs-buddy/profile";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useQuery<Profile | null>({
    queryKey: ["profile"],
    queryFn: () => fetchApi("/api/profile"),
  });

  const save = useMutation({
    mutationFn: (body: Profile) =>
      fetchApi("/api/profile", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  if (isLoading) return <p>Loading...</p>;

  const defaultProfile: Profile = {
    personal: {
      firstName: "", lastName: "", email: "", phone: "", location: "",
      linkedIn: "", gitHub: "", portfolio: "",
    },
    experience: [],
    education: [],
    skills: [],
    preferences: {
      targetRoles: [], targetLocations: ["Remote"], targetTech: ["React", "Next.js", "TypeScript"],
      minMatchScore: 80,
      expectedSalary: { currency: "EUR", min: 80000, max: 120000 },
      noticePeriod: "1 month",
      workAuthorization: "EU citizen",
    },
  };

  const p = profile ?? defaultProfile;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Profile Settings</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const updated: Profile = {
            ...p,
            personal: {
              ...p.personal,
              firstName: fd.get("firstName") as string,
              lastName: fd.get("lastName") as string,
              email: fd.get("email") as string,
              phone: fd.get("phone") as string,
              location: fd.get("location") as string,
              linkedIn: fd.get("linkedIn") as string,
              gitHub: fd.get("gitHub") as string,
              portfolio: fd.get("portfolio") as string,
            },
            preferences: {
              ...p.preferences,
              minMatchScore: parseInt(fd.get("minMatchScore") as string, 10),
              targetRoles: (fd.get("targetRoles") as string).split(",").map((s) => s.trim()).filter(Boolean),
              targetTech: (fd.get("targetTech") as string).split(",").map((s) => s.trim()).filter(Boolean),
              noticePeriod: fd.get("noticePeriod") as string,
              workAuthorization: fd.get("workAuthorization") as string,
            },
            skills: (fd.get("skills") as string).split(",").map((s) => s.trim()).filter(Boolean),
          };
          save.mutate(updated);
        }}
        className="space-y-4"
      >
        <FieldGroup title="Personal">
          <Input name="firstName" label="First Name" defaultValue={p.personal.firstName} />
          <Input name="lastName" label="Last Name" defaultValue={p.personal.lastName} />
          <Input name="email" label="Email" defaultValue={p.personal.email} />
          <Input name="phone" label="Phone" defaultValue={p.personal.phone} />
          <Input name="location" label="Location" defaultValue={p.personal.location} />
          <Input name="linkedIn" label="LinkedIn" defaultValue={p.personal.linkedIn} />
          <Input name="gitHub" label="GitHub" defaultValue={p.personal.gitHub} />
          <Input name="portfolio" label="Portfolio" defaultValue={p.personal.portfolio} />
        </FieldGroup>

        <FieldGroup title="Preferences">
          <Input name="targetRoles" label="Target Roles (comma-separated)" defaultValue={p.preferences.targetRoles.join(", ")} />
          <Input name="targetTech" label="Target Tech (comma-separated)" defaultValue={p.preferences.targetTech.join(", ")} />
          <Input name="skills" label="Skills (comma-separated)" defaultValue={p.skills.join(", ")} />
          <Input name="minMatchScore" label="Min Match Score" type="number" defaultValue={String(p.preferences.minMatchScore)} />
          <Input name="noticePeriod" label="Notice Period" defaultValue={p.preferences.noticePeriod} />
          <Input name="workAuthorization" label="Work Authorization" defaultValue={p.preferences.workAuthorization} />
        </FieldGroup>

        <button
          type="submit"
          disabled={save.isPending}
          className="rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {save.isPending ? "Saving..." : "Save Profile"}
        </button>
        {save.isSuccess && <p className="text-sm text-green-600">Profile saved.</p>}
      </form>
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-border p-4">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Input({ name, label, defaultValue, type = "text" }: { name: string; label: string; defaultValue?: string; type?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5"
      />
    </label>
  );
}
