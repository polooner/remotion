import {
	FrameRange,
	ImageFormat,
	Internals,
	LogLevel,
	PixelFormat,
	ProResProfile,
} from 'remotion';
import {AwsRegion} from '../pricing/aws-regions';
import {callLambda} from '../shared/call-lambda';
import {
	DEFAULT_FRAMES_PER_LAMBDA,
	LambdaRoutines,
	Privacy,
} from '../shared/constants';
import {convertToServeUrl} from '../shared/convert-to-serve-url';
import {validateFramesPerLambda} from '../shared/validate-frames-per-lambda';

/**
 * @description Triggers a render on a lambda given a composition and a lambda function.
 * @link https://remotion-3.vercel.app/docs/lambda/rendermediaonlambda
 * @param params.functionName The name of the Lambda function that should be used
 * @param params.serveUrl The URL of the deployed project
 * @param params.composition The ID of the composition which should be rendered.
 * @param params.inputProps The input props that should be passed to the composition.
 * @param params.codec The video codec which should be used for encoding.
 * @param params.imageFormat In which image format the frames should be rendered.
 * @param params.crf The constant rate factor to be used during encoding.
 * @param params.envVariables Object containing environment variables to be inserted into the video environment
 * @param params.proResProfile The ProRes profile if rendering a ProRes video
 * @param params.quality JPEG quality if JPEG was selected as the image format.
 * @param params.region The AWS region in which the video should be rendered.
 * @param params.maxRetries How often rendering a chunk may fail before the video render gets aborted.
 * @param params.enableChunkOptimization Whether Remotion should restructure and optimize chunks for subsequent renders. Default true.
 * @param params.logLevel Level of logging that Lambda function should perform. Default "info".
 * @returns `Promise<{renderId: string; bucketName: string}>`
 */

export const renderMediaOnLambda = async ({
	functionName,
	serveUrl,
	inputProps,
	codec,
	imageFormat,
	crf,
	envVariables,
	pixelFormat,
	proResProfile,
	quality,
	region,
	maxRetries,
	composition,
	framesPerLambda,
	privacy,
	enableChunkOptimization,
	logLevel,
	frameRange,
}: {
	region: AwsRegion;
	functionName: string;
	serveUrl: string;
	composition: string;
	inputProps: unknown;
	codec: 'h264-mkv' | 'mp3' | 'aac' | 'wav';
	imageFormat: ImageFormat;
	crf?: number | undefined;
	envVariables?: Record<string, string>;
	pixelFormat?: PixelFormat;
	proResProfile?: ProResProfile;
	privacy: Privacy;
	quality?: number;
	maxRetries: number;
	framesPerLambda?: number;
	enableChunkOptimization?: boolean;
	logLevel?: LogLevel;
	frameRange?: FrameRange;
}) => {
	validateFramesPerLambda(framesPerLambda);
	const realServeUrl = await convertToServeUrl(serveUrl, region);
	const res = await callLambda({
		functionName,
		type: LambdaRoutines.start,
		payload: {
			framesPerLambda: framesPerLambda ?? DEFAULT_FRAMES_PER_LAMBDA,
			composition,
			serveUrl: realServeUrl,
			inputProps,
			codec,
			imageFormat,
			crf,
			envVariables,
			pixelFormat,
			proResProfile,
			quality,
			maxRetries,
			privacy,
			enableChunkOptimization,
			logLevel: logLevel ?? Internals.Logging.DEFAULT_LOG_LEVEL,
			frameRange: frameRange ?? null,
		},
		region,
	});
	return {
		renderId: res.renderId,
		bucketName: res.bucketName,
	};
};

/**
 * @deprecated Renamed to renderMediaOnLambda()
 */
export const renderVideoOnLambda = renderMediaOnLambda;
