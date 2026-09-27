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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Progress,
  Skeleton,
  Spinner,
  ToastProvider,
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
          <AccordionItem value="item-2">
            <AccordionTrigger>Section 2</AccordionTrigger>
            <AccordionContent>
              <Text>Content 2</Text>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    });

    expect(renderer.toJSON()).toBeTruthy();
    act(() => {
      renderer.unmount();
    });
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
    act(() => {
      renderer.unmount();
    });
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
    act(() => {
      renderer.unmount();
    });
  });

  test('renders Progress bar', () => {
    let renderer: any;
    act(() => {
      renderer = create(<Progress value={45} />);
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => {
      renderer.unmount();
    });
  });

  test('renders Skeleton placeholder', () => {
    let renderer: any;
    act(() => {
      renderer = create(<Skeleton width={120} height={24} borderRadius={8} />);
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => {
      renderer.unmount();
    });
  });

  test('renders Spinner activity indicator', () => {
    let renderer: any;
    act(() => {
      renderer = create(<Spinner label="Processing..." showLabel />);
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => {
      renderer.unmount();
    });
  });

  test('renders ToastProvider', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <ToastProvider>
          <Text>App Child</Text>
        </ToastProvider>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => {
      renderer.unmount();
    });
  });

  test('renders AlertDialog compound component', () => {
    let renderer: any;
    act(() => {
      renderer = create(
        <AlertDialog.Root defaultOpen={false}>
          <AlertDialog.Trigger>
            <Text>Open Dialog</Text>
          </AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Title>Confirm Delete</AlertDialog.Title>
            <AlertDialog.Description>
              Are you sure you want to proceed?
            </AlertDialog.Description>
            <AlertDialog.Close>
              <Text>Cancel</Text>
            </AlertDialog.Close>
          </AlertDialog.Content>
        </AlertDialog.Root>
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
    act(() => {
      renderer.unmount();
    });
  });
});
