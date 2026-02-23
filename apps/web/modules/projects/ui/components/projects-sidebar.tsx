"use client";
import React from "react";
import { type LucideIcon, BookOpenText, ClipboardList, Coins, Info, LayoutTemplate, LogOut } from "lucide-react";
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
import { Separator } from "@workspace/ui/components/separator";
import { useTheme } from "next-themes";
import { OrganizationSwitcher, SignOutButton } from "@clerk/nextjs";
import { Logout01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ApiKeyDialog } from "./api-key-dialog";
import { useState } from "react";
import { KeyIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@workspace/ui/lib/utils";

type SidebarItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

const projectsNavItems: SidebarItem[] = [
  {
    title: "My Projects",
    url: "/projects",
    icon: ClipboardList,
  },
  {
    title: "Templates",
    url: "/templates",
    icon: LayoutTemplate,
  },
  {
    title: "Billing",
    url: "/pricing",
    icon: Coins,
  },
];
const helpNavItems: SidebarItem[] = [
  {
    title: "Documentation",
    url: "/docs",
    icon: BookOpenText,
  },
  {
    title: "Support",
    url: "/support",
    icon: Info,
  },
];
const configurationItems: SidebarItem[] = [
  {
    title: "API Keys",
    url: "/api-keys",
    icon: KeyIcon,
  },
];

const ProjectsSidebar = () => {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [showApiKeys, setShowApiKeys] = useState(false);
  const isActive = (url: string) => {
    if (url === "/") return pathname === "/";
    return pathname.startsWith(url);
  };
  return (
    <Sidebar className="group" collapsible="icon">
      <SidebarHeader>
        <p>Ctx</p>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
                <SidebarMenuItem key="org_123">
                  <OrganizationSwitcher />
                </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {projectsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    size="sm"
                    className={cn(isActive(item.url) && "bg-accent")}
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
          <SidebarGroupLabel>Help</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {helpNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    size="sm"
                    className={cn(isActive(item.url) && "bg-accent")}
                  >
                    <a href={item.url}>
                      <item.icon className="size-4" />
                      {item.title}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {configurationItems.map((item) => (
                <SidebarMenuItem key={item.title} >
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    size="sm"
                    className={cn(isActive(item.url) && "bg-accent")}
                  >
                    <a href={item.url}>
                      <item.icon className="size-4" />
                      {item.title}
                    </a>
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
              <SidebarMenuButton
                asChild
                tooltip={"Signout"}
                size="sm"
                className="cursor-pointer"
              >
                {
                  <SignOutButton redirectUrl="/sign-in">
                    <div className="flex items-center justify-center gap-2">
                      <LogOut /> Sign Out
                    </div>
                  </SignOutButton>
                }
              </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail className="!cursor-col-resize" />
      <ApiKeyDialog open={showApiKeys} onOpenChange={setShowApiKeys} />
    </Sidebar>
  );
};

export default ProjectsSidebar;
