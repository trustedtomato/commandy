export declare type ArgumentTypes = 'required' | 'optional';
export interface Argument {
    type: ArgumentTypes;
    name: string;
}
export declare type OptionAppearanceTypes = 'long' | 'short';
export interface OptionAppearance {
    text: string;
    type: OptionAppearanceTypes;
}
export interface BasicOption {
    appearances: OptionAppearance[];
    argument: Argument | null;
}
export declare class Option {
    _appearances: OptionAppearance[];
    _argument: Argument | null;
    _description?: string;
    _canBeLonely: boolean;
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
    class TooManyArguments extends ParsingWarning {
        readonly args: Argument[];
        readonly givenArgs: string[];
        constructor(args: Argument[], givenArgs: string[]);
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
