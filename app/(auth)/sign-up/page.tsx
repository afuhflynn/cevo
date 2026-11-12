import type { Metadata } from "next";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Cevo account with an email and password.",
};

export default function SignUpPage() {
  return <SignUpForm />;
}
