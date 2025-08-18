import React, { useState } from "react";

const FreeTrialForm = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();

    // Simple email validation
    if (!email) {
      setError("Please enter your Email");
      return;
    }

    // If no errors, redirect (simulate GET method)
    window.location.href = `/register?email=${encodeURIComponent(email)}`;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-3"
      noValidate
    >
      <div className="mb-4 w-64">
        <input
          type="email"
          id="email"
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          required
          maxLength={255}
          autoComplete="email"
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>

      <div className="mb-2 text-center">
        <button
          type="submit"
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition w-full"
        >
          Try for free
        </button>
        <div className="w-40">
        <small className="text-xs text-gray-500">
          🎉   No credit card required
        </small>
        </div>
      </div>

     
    </form>
  );
};

export default FreeTrialForm;