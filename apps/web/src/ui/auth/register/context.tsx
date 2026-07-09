"use client";

import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useState,
} from "react";

interface RegisterContextType {
  email: string;
  password: string;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  lockEmail?: boolean;
}

const RegisterContext = createContext<RegisterContextType | undefined>(
  undefined,
);

export const RegisterProvider: React.FC<
  PropsWithChildren<{ email?: string; lockEmail?: boolean }>
> = ({ email: emailProp, lockEmail, children }) => {
  const [email, setEmail] = useState(emailProp ?? "");
  const [password, setPassword] = useState("");

  return (
    <RegisterContext.Provider
      value={{
        email,
        password,
        setEmail,
        setPassword,
        lockEmail,
      }}
    >
      {children}
    </RegisterContext.Provider>
  );
};

export const useRegisterContext = () => {
  const context = useContext(RegisterContext);

  if (context === undefined) {
    throw new Error(
      "useRegisterContext must be used within a RegisterProvider",
    );
  }

  return context;
};
