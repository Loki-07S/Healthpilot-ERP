'use client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar';
import { navGroups } from '@/config/nav-config';
import { useFilteredNavGroups } from '@/hooks/use-nav';
import type { NavItem } from '@/types';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import { useRole } from '@/lib/role';

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user: activeUser, role: activeRole } = useRole();
  const filteredGroups = useFilteredNavGroups(navGroups);

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader />
      <SidebarContent className='overflow-x-hidden'>
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label || 'ungrouped'} className='py-0'>
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarMenu>
              {group.items.map((item) => (
                <NavMainItem key={item.title} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className='p-2 rounded-lg bg-sidebar-accent/50 border border-sidebar-border/40'>
              <div className='flex items-center gap-2 mb-2'>
                <div
                  className={`size-7 rounded-full flex items-center justify-center font-bold text-white text-xs ${activeUser.color}`}
                >
                  {activeUser.avatarText}
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='text-xs font-semibold truncate text-sidebar-foreground'>
                    {activeUser.name}
                  </div>
                  <div className='text-[10px] text-muted-foreground truncate'>
                    {activeUser.title}
                  </div>
                </div>
              </div>
              <Link
                href='/login'
                className='w-full flex items-center justify-center gap-1.5 py-1 px-2 text-[11px] font-medium rounded bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 transition-colors'
              >
                <span>Switch Role / Staff</span>
                <span>→</span>
              </Link>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function isActivePath(pathname: string, url: string) {
  return pathname === url || (url !== '/' && pathname.startsWith(`${url}/`));
}

function NavMainItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const { state, isMobile } = useSidebar();
  const Icon = item.icon ? Icons[item.icon] : Icons.logo;
  const children = item.items ?? [];

  if (children.length === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          render={<Link href={item.url} aria-label={item.title} />}
          tooltip={item.title}
          isActive={pathname === item.url}
        >
          <Icon />
          <span>{item.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  const hasActiveChild = children.some((child) => isActivePath(pathname, child.url));

  // The icon rail hides sub-items, so a group opens its links in a menu to the right instead
  if (state === 'collapsed' && !isMobile) {
    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                tooltip={item.title}
                isActive={hasActiveChild}
                className='data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground'
              />
            }
          >
            <Icon />
            <span>{item.title}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side='right'
            align='start'
            sideOffset={8}
            className='w-auto min-w-48'
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {children.map((child) => {
                const ChildIcon = child.icon ? Icons[child.icon] : null;
                const active = isActivePath(pathname, child.url);
                return (
                  <DropdownMenuItem
                    key={child.title}
                    render={
                      <Link
                        href={child.url}
                        aria-label={child.title}
                        aria-current={active ? 'page' : undefined}
                      />
                    }
                    className={active ? 'bg-accent text-accent-foreground font-medium' : undefined}
                  >
                    {ChildIcon && <ChildIcon />}
                    {child.title}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible defaultOpen={item.isActive || hasActiveChild} render={<SidebarMenuItem />}>
      <CollapsibleTrigger
        render={
          <SidebarMenuButton
            tooltip={item.title}
            isActive={pathname === item.url}
            className='group/collapsible'
          />
        }
      >
        {item.icon && <Icon />}
        <span>{item.title}</span>
        <Icons.chevronRight className='ml-auto transition-transform duration-200 group-data-panel-open/collapsible:rotate-90' />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {children.map((child) => (
            <SidebarMenuSubItem key={child.title}>
              <SidebarMenuSubButton
                render={<Link href={child.url} aria-label={child.title} />}
                isActive={pathname === child.url}
              >
                <span>{child.title}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}
