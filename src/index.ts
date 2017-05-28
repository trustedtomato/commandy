import {splitBySpace,last,twist,flattenMapKeys} from './helper-functions';
import {parseArgvs,Input as ParsingInput,Result} from './parsing';


/*--- for parsing the input of the program definer ---*/
interface BasicArgument{
	type:('required' | 'optional')
	name:string
}

const requiredArgRegex = /^\<([a-z0-9-_]+)\>$/i;
const optionalArgRegex = /^\[([a-z0-9-_]+)\]$/i;
const isRawArgValid = (rawArg:string) => requiredArgRegex.test(rawArg) || optionalArgRegex.test(rawArg);
const parseRawArg = (rawArg:string):BasicArgument => {
	const requiredArgMatch = rawArg.match(requiredArgRegex);
	const optionalArgMatch = rawArg.match(optionalArgRegex);
	if(requiredArgMatch) return{ type: 'required', name: requiredArgMatch[1] };
	if(optionalArgMatch) return{ type: 'optional', name: optionalArgMatch[1] };
	throw new Error('Invalid argument: '+rawArg);	
};
const parseArgSyntax = (argSyntax:string):BasicArgument[] => splitBySpace(argSyntax).map(parseRawArg);


interface BasicOption{
	appearances:string[],
	argument:ParsingInput.Argument|null
}

const optionRegex = /^(?:(?:-([a-z0-9_]))|(?:--([a-z0-9-_]+)))$/i;
const parseOptionSyntax = (optionSyntax:string):BasicOption => {
	const rawAppearances = optionSyntax.trim().split(/[,\s]+/g);
	const lastRawAppearance = last(rawAppearances);
	const [argument,appearances] =
		isRawArgValid(lastRawAppearance)
		? [parseRawArg(lastRawAppearance),rawAppearances.slice(0,-1)]
		: [null,rawAppearances];

	appearances.forEach(appearance => {
		if(!optionRegex.test(appearance)){
			throw new Error('Invalid option: '+appearance);
		}
	});

	return{argument,appearances};
};


/*--- define the API */
export interface OptionOptions{
	inheritance?:boolean
}

export interface OptionOptionsWithDesc extends OptionOptions{
	description?:boolean
}

export class Program{
	config = new ParsingInput.ProgramConfig();
	description(description:string):this{
		this.config.description = description;
		return this;
	}
	arguments(syntax:string):this{
		const _arguments = parseArgSyntax(syntax);
		this.config.args = _arguments;
		return this;
	}
	option(appearances:string,description:string,options?:OptionOptions):this
	option(appearances:string,options?:OptionOptionsWithDesc):this
	option(option:ParsingInput.Option):this
	option(
		appearancesOrOption:string|ParsingInput.Option,
		descriptionOrOptions:string|OptionOptionsWithDesc = '',
		options:OptionOptions = {}
	):this{
		if(typeof descriptionOrOptions === 'string'){
			Object.assign(options,{
				description: descriptionOrOptions
			});
		}else{
			options = descriptionOrOptions;
		}
		const option = Object.assign(
			typeof appearancesOrOption === 'string'
				? parseOptionSyntax(appearancesOrOption)
				: appearancesOrOption
			,{
				inheritance: false,
				description: ''
			}
			,options
		);
		
		const alreadyExistingAppearances = flattenMapKeys(twist(this.config.options,'appearances'));
		const alreadyExistingAppearance = option.appearances.find(appearance => {
			return alreadyExistingAppearances.has(appearance);
		});

		if(alreadyExistingAppearance){
			throw new Error('Option appearance already exists: '+alreadyExistingAppearance);
		}
		this.config.options.push(option);
		return this;
	}
	command(cmd:string,program:Program):this
	command(cmd:string,programConfig:ParsingInput.ProgramConfig):this
	command(cmd:string,programOrProgramConfig:Program|ParsingInput.ProgramConfig):this{
		const programConfig =
			programOrProgramConfig instanceof Program
			? programOrProgramConfig.config
			: programOrProgramConfig

		this.config.commands.set(cmd,programConfig);
		return this;
	}
	parse(argvs:string[]){
		return parseArgvs(argvs,this.config);
	}
	constructor(syntax:string = ''){
		this.config.program = this;
		this.arguments(syntax);
	}
}
export const createProgram = (syntax?:string):Program => {
	return new Program(syntax);
};