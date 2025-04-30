import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterForm } from "../register-form";

const mockConsoleLog = jest.spyOn(console, "log").mockImplementation();

jest.mock("lucide-react", () => ({
    Loader2Icon: () => <svg />,
  }));

afterEach(() => {
  mockConsoleLog.mockReset();
});

describe("RegisterForm", () => {
  it("renders the form correctly", () => {
    render(<RegisterForm />);
    
    // Check for form elements
    expect(screen.getByText("Create an account at mealbud.ai")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /register/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
    expect(screen.getByText(/already have an account\?/i)).toBeInTheDocument();
  });

  it("shows validation errors for empty fields", async () => {
    render(<RegisterForm />);
    const user = userEvent.setup();
    
    await user.click(screen.getByRole("button", { name: /register/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it("validates email format", async () => {
    render(<RegisterForm />);
    const user = userEvent.setup();
    
    // Enter invalid email
    await user.type(screen.getByLabelText(/email/i), "invalidemail");
    
    // Submit form
    await user.click(screen.getByRole("button", { name: /register/i }));
    
    // Check for email validation error
    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
    });
  });
  
  it("validates password matching", async () => {
    render(<RegisterForm />);
    const user = userEvent.setup();
    
    // Fill the form with mismatched passwords
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/^password/i), "Password123!");
    await user.type(screen.getByLabelText(/confirm password/i), "DifferentPassword!");
    
    // Submit form
    await user.click(screen.getByRole("button", { name: /register/i }));
    
    // Check for password matching error
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });
  
  it("submits the form with valid data", async () => {
    render(<RegisterForm />);
    const user = userEvent.setup();
    
    // Fill the form with valid data
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/^password/i), "Password123!");
    await user.type(screen.getByLabelText(/confirm password/i), "Password123!");
    
    // Submit form
    await user.click(screen.getByRole("button", { name: /register/i }));
    
    // Verify form submission was called with correct data
    await waitFor(() => {
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Form submitted",
        {
          email: "test@example.com",
          password: "Password123!",
          confirmPassword: "Password123!"
        }
      );
    });
  });
  
  it("displays loading state during form submission", async () => {
    render(<RegisterForm />);
    const user = userEvent.setup();
    
    // Fill form with valid data
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/^password/i), "Password123!");
    await user.type(screen.getByLabelText(/confirm password/i), "Password123!");
    
    // Submit form
    await user.click(screen.getByRole("button", { name: /register/i }));
    
    // Check for loading state
    expect(screen.getByText(/registering/i)).toBeInTheDocument();
    expect(screen.getByText(/registering/i).closest("button")).toBeDisabled();
  });
});
