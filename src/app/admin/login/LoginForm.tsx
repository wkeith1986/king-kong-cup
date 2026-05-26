"use client";

import { useState, useTransition } from "react";
import { loginAction } from "../actions";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="card p-5 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const res = await loginAction(fd);
          // loginAction redirects on success; if we get back a value, it
          // means there was an error.
          if (res && !res.ok) setError(res.error);
        });
      }}
    >
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="input"
        />
      </div>
      {error && (
        <div className="text-rose-300 text-sm">{error}</div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-gold w-full"
      >
        {pending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
