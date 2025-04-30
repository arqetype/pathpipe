import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "../theme-provider";

jest.mock("next-themes", () => ({
  ThemeProvider: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid="next-themes-provider" data-props={JSON.stringify(props)}>
      {children}
    </div>
  ),
}));

describe("ThemeProvider", () => {
  it("renders NextThemesProvider with correct props", () => {
    render(
      <ThemeProvider>
        <div data-testid="child-element">Test Child</div>
      </ThemeProvider>
    );

    const provider = screen.getByTestId("next-themes-provider");
    const props = JSON.parse(provider.getAttribute("data-props") ?? "{}");

    expect(props.attribute).toBe("class");
    expect(props.defaultTheme).toBe("system");
    expect(props.enableSystem).toBe(true);
    expect(props.disableTransitionOnChange).toBe(true);
    expect(props.enableColorScheme).toBe(true);

    expect(screen.getByTestId("child-element")).toBeInTheDocument();
    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });
});
