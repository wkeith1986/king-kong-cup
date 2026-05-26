import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { getAll } from "@/lib/data";
import { CoursesEditor } from "./CoursesEditor";

export const dynamic = "force-dynamic";

export default async function CoursesAdminPage() {
  if (!isAdminAuthenticated()) {
    redirect("/admin/login");
  }
  const { courses, tees, holes } = await getAll();

  return (
    <div className="container-narrow pt-6 pb-16">
      <div className="mb-4">
        <Link
          href="/admin"
          className="text-xs uppercase tracking-widest text-brand-cream/60 hover:text-brand-gold"
        >
          ← Admin
        </Link>
        <h1 className="h-display text-2xl sm:text-3xl text-brand-cream font-bold mt-1">
          Courses · Tees & Holes
        </h1>
        <p className="text-sm text-brand-cream/70 mt-1">
          Edit the per-tee rating/slope and per-hole par/stroke index. Changes
          to par or stroke index automatically re-derive net-to-par and skins
          on any rounds already played for that course.
        </p>
      </div>

      <CoursesEditor courses={courses} tees={tees} holes={holes} />
    </div>
  );
}
