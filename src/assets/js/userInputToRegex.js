function parseRegex(string) { // adapted from https://stackoverflow.com/a/22763959 by staabm, licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
  const [, expression, flags] = string.match(/^\/(.*?)\/([gimyus]*)$/);
  return { expression, flags };
}

export default function userInputToRegex(input) {
  if (input.startsWith('/')) { // it has delimiters (or is invalid)
    const { expression, flags } = parseRegex(input);
    return new RegExp(expression, flags);
  }
  return new RegExp(input);
}
