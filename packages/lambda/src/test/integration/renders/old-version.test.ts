import {RenderInternals} from '@remotion/renderer';
import {VERSION} from 'remotion/version';
import {afterAll, beforeAll, expect, test} from 'vitest';
import {LambdaRoutines} from '../../../defaults';
import {disableLogs, enableLogs} from '../../disable-logs';
import {callLambda} from '../../../shared/call-lambda';

beforeAll(() => {
	disableLogs();
});

afterAll(async () => {
	enableLogs();

	await RenderInternals.killAllBrowsers();
});

test('Should fail when using an incompatible version', () => {
	process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE = '2048';

	expect(() =>
		callLambda({
			type: LambdaRoutines.start,
			payload: {
				serveUrl: 'https://competent-mccarthy-56f7c9.netlify.app/',
				chromiumOptions: {},
				codec: 'h264',
				composition: 'react-svg',
				crf: 9,
				envVariables: {},
				frameRange: [0, 12],
				framesPerLambda: 8,
				imageFormat: 'png',
				inputProps: {
					type: 'payload',
					payload: '{}',
				},
				logLevel: 'warn',
				maxRetries: 3,
				outName: null,
				pixelFormat: 'yuv420p',
				privacy: 'public',
				proResProfile: undefined,
				jpegQuality: undefined,
				scale: 1,
				timeoutInMilliseconds: 12000,
				numberOfGifLoops: null,
				everyNthFrame: 1,
				concurrencyPerLambda: 1,
				downloadBehavior: {
					type: 'play-in-browser',
				},
				muted: false,
				version: VERSION,
				overwrite: true,
				webhook: null,
				audioBitrate: null,
				videoBitrate: null,
				forceHeight: null,
				forceWidth: null,
				rendererFunctionName: null,
				bucketName: null,
				audioCodec: null,
			},
			functionName: 'remotion-dev-render',
			receivedStreamingPayload: () => undefined,
			region: 'us-east-1',
			timeoutInTest: 120000,
		})
	).rejects.toThrow(/Incompatible site: When visiting/);
});
