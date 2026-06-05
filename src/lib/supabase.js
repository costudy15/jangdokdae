import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function listStudents() {
  const { data } = await supabase.rpc("list_students");
  return data || [];
}
export async function createStudent(p_name, p_school, p_grade, p_password) {
  return supabase.rpc("create_student", { p_name, p_school, p_grade, p_password });
}
export async function loginStudent(id, pw) {
  const { data } = await supabase.rpc("login_student", { p_id: id, p_password: pw });
  return !!data;
}
export async function deleteStudent(id) {
  return supabase.rpc("delete_student", { p_id: id });
}
export async function verifyTeacher(pw) {
  const { data } = await supabase.rpc("verify_teacher", { p_password: pw });
  return !!data;
}

export async function logAttempt(rec) {
  return supabase.from("attempts").insert(rec);
}
export async function attemptsOf(studentId) {
  const { data } = await supabase.from("attempts").select("*").eq("student_id", studentId).order("created_at");
  return data || [];
}
export async function allAttempts() {
  const { data } = await supabase.from("attempts").select("*");
  return data || [];
}
