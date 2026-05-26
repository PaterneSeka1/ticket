import { redirect } from "next/navigation";

export default function UserCreationPage() {
  redirect("/dashboard/super-admin/users");
}
