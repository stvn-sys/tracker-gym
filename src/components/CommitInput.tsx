import { useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

/**
 * Text field that saves when you leave it or press Enter.
 * (onEndEditing does not fire in browsers, so this uses blur + submit.)
 */
export function CommitInput({ initial, onCommit, ...rest }: Omit<TextInputProps, 'value' | 'onChangeText' | 'defaultValue'> & {
  initial: string;
  onCommit: (text: string) => void;
}) {
  const [text, setText] = useState(initial);
  const [last, setLast] = useState(initial);
  const commit = () => {
    if (text === last) return;
    setLast(text);
    onCommit(text);
  };
  return <TextInput {...rest} value={text} onChangeText={setText} onBlur={commit} onSubmitEditing={commit} returnKeyType="done" />;
}
