"use client";
import React from "react";
import { type LucideIcon, ClipboardList, InboxIcon } from "lucide-react";
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
import { SignOutButton } from "@clerk/nextjs";
import { Logout01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type SidebarItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

const projectsNavItems: SidebarItem[] = [
  {
    title: "Designs",
    url: "/designs",
    icon: InboxIcon,
  },
  {
    title: "Requirements",
    url: "/requirements",
    icon: ClipboardList,
  },
];
const configurationItems: SidebarItem[] = [];

const ProjectsSidebar = () => {
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
              {projectsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive(item.url)}
                    size="sm"
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

export default ProjectsSidebar;
