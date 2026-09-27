import React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDialog,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Combobox,
  ComboboxInput,
  ComboboxItem,
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Field,
  FieldLabel,
  Input,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  RadioGroup,
  RadioGroupItem,
  ScrollArea,
  Select,
  SelectItem,
  SelectTrigger,
  Sheet,
  SheetContent,
  Sidebar,
  SidebarNavItem,
  SidebarNavTop,
  SidebarSessionGroup,
  SidebarSessionRow,
  SidebarSessions,
  Skeleton,
  Slider,
  Spinner,
  Switch,
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ToastProvider,
  Toggle,
  ToggleGroup,
  Tooltip,
} from '../src/components/ui';

describe('Base UI Components (Puku Theme)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('renders Accordion and toggles item', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <Accordion defaultValue={['item-1']}>
          <AccordionItem value="item-1">
            <AccordionTrigger>Section 1</AccordionTrigger>
            <AccordionContent>
              <Text>Content 1</Text>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => renderer.unmount());
  });

  test('renders Collapsible and toggles content', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <Collapsible defaultOpen={true}>
          <CollapsibleTrigger>
            <Text>Toggle Details</Text>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Text>Secret details</Text>
          </CollapsibleContent>
        </Collapsible>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => renderer.unmount());
  });

  test('renders Alert with variants', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <Alert variant="warning">
          <AlertTitle>Warning Title</AlertTitle>
          <AlertDescription>Warning description message</AlertDescription>
        </Alert>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => renderer.unmount());
  });

  test('renders Progress and Skeleton loaders', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <>
          <Progress value={45} />
          <Skeleton width={120} height={24} />
          <Spinner label="Loading..." />
        </>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => renderer.unmount());
  });

  test('renders ToastProvider and AlertDialog', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <ToastProvider>
          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Text>Open</Text>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>Title</AlertDialog.Title>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </ToastProvider>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => renderer.unmount());
  });

  test('renders Button and ButtonGroup with variants', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <ButtonGroup>
          <Button variant="default">Primary</Button>
          <Button variant="outline" size="sm">
            Outline
          </Button>
          <Button variant="destructive" size="lg">
            Delete
          </Button>
        </ButtonGroup>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => renderer.unmount());
  });

  test('renders Badge with variants', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <>
          <Badge variant="default">Default</Badge>
          <Badge variant="success">Active</Badge>
          <Badge variant="destructive">Error</Badge>
        </>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => renderer.unmount());
  });

  test('renders Card compound component', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>
            <Text>Card Body</Text>
          </CardContent>
          <CardFooter>
            <Button size="sm">Action</Button>
          </CardFooter>
        </Card>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => renderer.unmount());
  });

  test('renders Avatar with fallback', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <Avatar size={40}>
          <AvatarFallback>PK</AvatarFallback>
        </Avatar>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => renderer.unmount());
  });

  test('renders Switch and Checkbox toggles', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <>
          <Switch value={true} />
          <Checkbox checked={true} />
        </>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => renderer.unmount());
  });

  test('renders Tabs compound component', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">
            <Text>Tab 1 Content</Text>
          </TabsContent>
        </Tabs>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => renderer.unmount());
  });

  test('renders Dialog and Sheet', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <>
          <Dialog.Root>
            <Dialog.Trigger>
              <Text>Open Dialog</Text>
            </Dialog.Trigger>
            <Dialog.Content>
              <Dialog.Title>Dialog Header</Dialog.Title>
            </Dialog.Content>
          </Dialog.Root>
          <Sheet>
            <SheetContent side="right">
              <Text>Sheet Body</Text>
            </SheetContent>
          </Sheet>
        </>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => renderer.unmount());
  });

  test('renders DropdownMenu and Popover', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Text>Menu</Text>
            </DropdownMenuTrigger>
            <DropdownMenuItem>
              <Text>Item 1</Text>
            </DropdownMenuItem>
          </DropdownMenu>
          <Popover>
            <PopoverTrigger>
              <Text>Popover</Text>
            </PopoverTrigger>
            <PopoverContent>
              <Text>Popover Body</Text>
            </PopoverContent>
          </Popover>
        </>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => renderer.unmount());
  });

  test('renders Input, Field, and Select', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <>
          <Field>
            <FieldLabel>Username</FieldLabel>
            <Input placeholder="Enter username" />
          </Field>
          <Select defaultValue="opt1">
            <SelectTrigger placeholder="Choose" />
            <SelectItem value="opt1">Option 1</SelectItem>
          </Select>
        </>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => renderer.unmount());
  });

  test('renders Table, Command, and Pagination', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Col 1</TableHead>
              </TableRow>
            </TableHeader>
            <TableRow>
              <TableCell>Val 1</TableCell>
            </TableRow>
          </Table>
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandItem>Option 1</CommandItem>
            </CommandList>
          </Command>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationLink active>1</PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => renderer.unmount());
  });

  test('renders Sidebar Claude Code-style app navigation', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <Sidebar>
          <SidebarNavTop>
            <SidebarNavItem icon={<Text>#</Text>}>Chats</SidebarNavItem>
            <SidebarNavItem icon={<Text>*</Text>}>Projects</SidebarNavItem>
          </SidebarNavTop>
          <SidebarSessions>
            <SidebarSessionGroup label="RECENTS">
              <SidebarSessionRow
                label="Conversation 1"
                iconVariant="diff"
                active
              />
            </SidebarSessionGroup>
          </SidebarSessions>
        </Sidebar>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => renderer.unmount());
  });

  test('renders RadioGroup, Slider, Toggle, Tooltip, and ScrollArea', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <ScrollArea>
          <RadioGroup defaultValue="r1">
            <RadioGroupItem value="r1" />
          </RadioGroup>
          <Slider value={50} />
          <ToggleGroup type="single" defaultValue="t1">
            <Toggle value="t1">T1</Toggle>
          </ToggleGroup>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Text>Hover</Text>
            </Tooltip.Trigger>
            <Tooltip.Content>Tooltip info</Tooltip.Content>
          </Tooltip.Root>
          <Combobox>
            <ComboboxInput />
            <ComboboxItem value="c1">C1</ComboboxItem>
          </Combobox>
        </ScrollArea>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => renderer.unmount());
  });
});
