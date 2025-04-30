import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RegisterForm } from "../register-form";
import { zodResolver } from "@hookform/resolvers/zod";

jest.mock("@hookform/resolvers/zod", () => ({
    zodResolver: jest.fn(),
}));

describe("RegisterForm", () => {
    it("renders the form with all fields and buttons", () => {
        render(<RegisterForm />);

        expect(screen.getByText(/Create an account at mealbud.ai/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Login/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Google/i })).toBeInTheDocument();
    });

    it("disables the submit button when isPending is true", () => {
        render(<RegisterForm />);

        const submitButton = screen.getByRole("button", { name: /Login/i });
        expect(submitButton).not.toBeDisabled();

        fireEvent.click(submitButton);
        expect(submitButton).toBeDisabled();
    });

    it("shows validation errors when fields are empty", async () => {
        render(<RegisterForm />);

        const submitButton = screen.getByRole("button", { name: /Login/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
            expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
            expect(screen.getByText(/Confirm Password is required/i)).toBeInTheDocument();
        });
    });

    it("calls handleSubmit with valid form data", async () => {
        const mockHandleSubmit = jest.fn();
        zodResolver.mockImplementation(() => mockHandleSubmit);

        render(<RegisterForm />);

        fireEvent.input(screen.getByLabelText(/Email/i), {
            target: { value: "test@example.com" },
        });
        fireEvent.input(screen.getByLabelText(/Password/i), {
            target: { value: "password123" },
        });
        fireEvent.input(screen.getByLabelText(/Confirm Password/i), {
            target: { value: "password123" },
        });

        fireEvent.click(screen.getByRole("button", { name: /Login/i }));

        await waitFor(() => {
            expect(mockHandleSubmit).toHaveBeenCalled();
        });
    });

    it("shows error if passwords do not match", async () => {
        render(<RegisterForm />);

        fireEvent.input(screen.getByLabelText(/Email/i), {
            target: { value: "test@example.com" },
        });
        fireEvent.input(screen.getByLabelText(/Password/i), {
            target: { value: "password123" },
        });
        fireEvent.input(screen.getByLabelText(/Confirm Password/i), {
            target: { value: "password456" },
        });

        fireEvent.click(screen.getByRole("button", { name: /Login/i }));

        await waitFor(() => {
            expect(screen.getByText(/Passwords must match/i)).toBeInTheDocument();
        });
    });
});