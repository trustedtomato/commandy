export declare enum ArgumentTypes {
    required = 0,
    optional = 1,
}
export interface Argument {
    type: ArgumentTypes;
    name: string;
}
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
export declare class Option {
    appearances: OptionAppearance[];
    argument: Argument | null;
    description?: string;
    canBeLonely: boolean;
    constructor(fullSyntax: string, descriptionOrCanBeLonely?: string | boolean, canBeLonely?: boolean);
}
export declare const createOption: (fullSyntax: string, descriptionOrCanBeLonely?: string | boolean, canBeLonely?: boolean) => Option;
export declare class ParsingError {
}
export declare namespace ParsingErrors {
    class ShortOptionWithValueCannotBeCombined extends ParsingError {
        plainCombinedOptions: string;
        wrongOption: Option;
        constructor(plainCombinedOptions: string, wrongOption: Option);
    }
    class MissingArguments extends ParsingError {
        readonly requiredArgs: string[];
        readonly givenArgs: string[];
        constructor(requiredArgs: string[], givenArgs: string[]);
    }
    class MissingOptionValue extends ParsingError {
        readonly rawOption: string;
        readonly option: Option;
        constructor(plainOption: string, option: Option);
    }
}
export declare class ParsingWarning {
}
export declare namespace ParsingWarnings {
    class InvalidOption extends ParsingWarning {
        readonly rawOption: string;
        constructor(rawOption: string);
    }
}
export interface Result {
    commandChain: string;
    program: Program;
    options: {
        [option: string]: string | boolean;
    };
    arguments: {
        [property: string]: string;
    };
    errors: ParsingError[];
    warnings: ParsingWarning[];
}
export declare class Program {
    private _arguments;
    private _description;
    private _commands;
    private _options;
    description(description: string): this;
    arguments(syntax: string): this;
    option(appearancesOrOption: string | Option, descriptionOrCanBeLonely?: string, canBeLonely?: boolean): this;
    command(cmd: string, program: Program): this;
    parse(argvs: string[]): Result;
    constructor(syntax?: string);
}
export declare const createProgram: (syntax?: string) => Program;
