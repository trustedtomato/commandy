export declare enum ArgumentTypes {
    required = 0,
    optional = 1,
}
export interface Argument {
    type: ArgumentTypes;
    name: string;
}
export declare const requiredArgRegex: RegExp;
export declare const optionalArgRegex: RegExp;
export declare const parseArgSyntax: (argSyntax: string) => Argument[];
/** The first bracket is the command, the second one is the argument syntax (which is optional) */
export declare const commandRegex: RegExp;
export declare enum OptionAppearanceTypes {
    long = 0,
    short = 1,
}
export interface OptionAppearance {
    text: string;
    type: OptionAppearanceTypes;
}
export interface BasicOption {
    appearances: OptionAppearance[];
    argument: Argument | null;
}
export declare const optionRegex: RegExp;
export declare const parseOption: (option: string) => {
    type: OptionAppearanceTypes;
    text: string;
};
export declare const parseOptionSyntax: (optionSyntax: string) => BasicOption;
export declare class Option {
    appearances: OptionAppearance[];
    argument: Argument | null;
    description?: string;
    canBeLonely: boolean;
    constructor(fullSyntax: string, descriptionOrCanBeLonely?: string | boolean, canBeLonely?: boolean);
}
export interface Result {
    commandChain: string;
    options: {
        [option: string]: string | boolean;
    };
    arguments: {
        [property: string]: string;
    };
}
export declare class Program {
    _arguments: Argument[];
    _description: string;
    _commands: Map<string, Program>;
    _options: Option[];
    description(description: string): this;
    arguments(syntax: string): void;
    option(appearances: string, descriptionOrCanBeLonely?: string, canBeLonely?: boolean): this;
    command(fullSyntax: string): Program;
    parse(argvs: string[]): Result;
    constructor(syntax?: string);
}
export declare const program: Program;
