import type {
	BrowserExecutable,
	BrowserLog,
	ChromiumOptions,
	DownloadMap,
	HeadlessBrowser,
	RemotionServer,
} from '@remotion/renderer';
import {getCompositions, selectComposition} from '@remotion/renderer';
import type {AnyCompMetadata} from 'remotion';
import {Log} from './log';
import {showSingleCompositionsPicker} from './show-compositions-picker';

const getCompName = ({
	cliArgs,
	compositionIdFromUi,
}: {
	cliArgs: string[];
	compositionIdFromUi: string | null;
}): {
	compName: string;
	remainingArgs: string[];
	reason: string;
} => {
	if (compositionIdFromUi) {
		return {
			compName: compositionIdFromUi,
			remainingArgs: [],
			reason: 'via UI',
		};
	}

	const [compName, ...remainingArgs] = cliArgs;

	return {compName, remainingArgs, reason: 'Passed as argument'};
};

export const getCompositionId = async ({
	args,
	compositionIdFromUi,
	inputProps,
	puppeteerInstance,
	envVariables,
	timeoutInMilliseconds,
	chromiumOptions,
	port,
	browserExecutable,
	downloadMap,
	serveUrlOrWebpackUrl,
	verbose,
	onBrowserLog,
	indent,
	server,
}: {
	args: string[];
	compositionIdFromUi: string | null;
	inputProps?: Record<string, unknown> | null;
	puppeteerInstance?: HeadlessBrowser;
	envVariables?: Record<string, string>;
	timeoutInMilliseconds?: number;
	chromiumOptions?: ChromiumOptions;
	port?: number | null;
	browserExecutable?: BrowserExecutable;
	downloadMap?: DownloadMap;
	serveUrlOrWebpackUrl: string;
	verbose: boolean;
	onBrowserLog?: (log: BrowserLog) => void;
	indent: boolean;
	server: RemotionServer;
}): Promise<{
	compositionId: string;
	reason: string;
	config: AnyCompMetadata;
	argsAfterComposition: string[];
}> => {
	const {
		compName,
		remainingArgs,
		reason: compReason,
	} = getCompName({
		cliArgs: args,
		compositionIdFromUi,
	});
	if (compName) {
		const config = await selectComposition({
			id: compName,
			inputProps,
			puppeteerInstance,
			envVariables,
			timeoutInMilliseconds,
			serveUrl: serveUrlOrWebpackUrl,
			browserExecutable,
			chromiumOptions,
			onBrowserLog,
			port,
			verbose,
			server,
		});

		if (!config) {
			throw new Error(`Cannot find composition with ID "${compName}"`);
		}

		return {
			compositionId: compName,
			reason: compReason,
			config,
			argsAfterComposition: remainingArgs,
		};
	}

	if (!process.env.CI) {
		const comps = await getCompositions(serveUrlOrWebpackUrl, {
			inputProps,
			puppeteerInstance,
			envVariables,
			timeoutInMilliseconds,
			chromiumOptions,
			port,
			browserExecutable,
			downloadMap,
			onBrowserLog,
			verbose,
			indent,
			server,
		});
		const {compositionId, reason} = await showSingleCompositionsPicker(comps);
		if (compositionId && typeof compositionId === 'string') {
			return {
				compositionId,
				reason,
				config: comps.find((c) => c.id === compositionId) as AnyCompMetadata,
				argsAfterComposition: args,
			};
		}
	}

	Log.error('Composition ID not passed.');
	Log.error('Pass an extra argument <composition-id>.');
	process.exit(1);
};
