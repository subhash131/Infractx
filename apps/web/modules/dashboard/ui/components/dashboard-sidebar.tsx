"use client";
import React from "react";
import { type LucideIcon, CreditCardIcon, InboxIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Separator } from "@workspace/ui/components/separator";
import { useTheme } from "next-themes";
import { SignOutButton } from "@clerk/nextjs";
import { Logout01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type SidebarItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

const customerSupportItems: SidebarItem[] = [
  {
    title: "Drafts",
    url: "/files",
    icon: InboxIcon,
  },
];
const configurationItems: SidebarItem[] = [];

const accountItems: SidebarItem[] = [
  {
    title: "Plans & Billing",
    url: "/billing",
    icon: CreditCardIcon,
  },
];

const DashboardSidebar = () => {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const isActive = (url: string) => {
    if (url === "/") return pathname === "/";
    return pathname.startsWith(url);
  };
  return (
    <Sidebar className="group" collapsible="icon">
      <SidebarHeader>
        <p>AI Figma</p>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Customer Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {customerSupportItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive(item.url)}
                    size="sm"
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      {item.title}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configurationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive(item.url)}
                    size="sm"
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      {item.title}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive(item.url)}
                    size="sm"
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      {item.title}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <Separator />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SignOutButton redirectUrl="/sign-in">
              <div className="flex items-center justify-center gap-2">
                <HugeiconsIcon icon={Logout01Icon} /> Sign Out
              </div>
            </SignOutButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail className="!cursor-col-resize" />
    </Sidebar>
  );
};

export default DashboardSidebar;
