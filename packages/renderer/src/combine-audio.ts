import {rmSync, writeFileSync} from 'fs';
import {join} from 'path';
import {VERSION} from 'remotion/version';
import type {AudioCodec} from './audio-codec';
import {mapAudioCodecToFfmpegAudioCodecName} from './audio-codec';
import {callFf} from './call-ffmpeg';
import type {LogLevel} from './log-level';
import {Log} from './logger';
import {parseFfmpegProgress} from './parse-ffmpeg-progress';
import {DEFAULT_SAMPLE_RATE} from './sample-rate';
import {truthy} from './truthy';

export const durationOf1Frame = (1024 / DEFAULT_SAMPLE_RATE) * 1_000_000;

export const getClosestAlignedTime = (targetTime: number) => {
	const decimalFramesToTargetTime = targetTime / durationOf1Frame;
	const nearestFrameIndexForTargetTime = Math.round(decimalFramesToTargetTime);
	return nearestFrameIndexForTargetTime * durationOf1Frame;
};

const encodeAudio = async ({
	files,
	resolvedAudioCodec,
	audioBitrate,
	filelistDir,
	output,
	indent,
	logLevel,
	addRemotionMetadata,
}: {
	files: string[];
	resolvedAudioCodec: AudioCodec;
	audioBitrate: string | null;
	filelistDir: string;
	output: string;
	indent: boolean;
	logLevel: LogLevel;
	addRemotionMetadata: boolean;
}) => {
	const fileList = files.map((p) => `file '${p}'`).join('\n');
	const fileListTxt = join(filelistDir, 'audio-files.txt');
	writeFileSync(fileListTxt, fileList);

	const command = [
		'-f',
		'concat',
		'-safe',
		'0',
		'-i',
		fileListTxt,
		'-c:a',
		mapAudioCodecToFfmpegAudioCodecName(resolvedAudioCodec),
		resolvedAudioCodec === 'aac' ? '-cutoff' : null,
		resolvedAudioCodec === 'aac' ? '18000' : null,
		'-b:a',
		audioBitrate ? audioBitrate : '320k',
		'-vn',
		addRemotionMetadata ? `-metadata` : null,
		addRemotionMetadata ? `comment=Made with Remotion ${VERSION}` : null,
		'-y',
		output,
	];

	try {
		const task = callFf({
			args: command,
			bin: 'ffmpeg',
			indent,
			logLevel,
		});
		task.stderr?.on('data', (data: Buffer) => {
			const parsed = parseFfmpegProgress(data.toString('utf8'));
			if (parsed === undefined) {
				Log.verbose({indent, logLevel}, data.toString('utf8'));
			} else {
				Log.verbose({indent, logLevel}, `Encoded ${parsed} audio frames`);
			}
		});
		await task;
		return output;
	} catch (e) {
		rmSync(filelistDir, {recursive: true});
		throw e;
	}
};

const combineAudioSeamlessly = async ({
	files,
	filelistDir,
	indent,
	logLevel,
	output,
	chunkDurationInSeconds,
	addRemotionMetadata,
}: {
	files: string[];
	filelistDir: string;
	indent: boolean;
	logLevel: LogLevel;
	output: string;
	chunkDurationInSeconds: number;
	addRemotionMetadata: boolean;
}) => {
	const fileList = files
		.map((p, i) => {
			const targetStart = i * chunkDurationInSeconds * 1_000_000;
			const endStart = (i + 1) * chunkDurationInSeconds * 1_000_000;

			const startTime = getClosestAlignedTime(targetStart);
			const endTime = getClosestAlignedTime(endStart);

			const realDuration = endTime - startTime;

			console.log({realDuration});

			let inpoint = 0;
			if (i > 0) {
				// Although we only asked for two frames of padding, ffmpeg will add an
				// additional 2 frames of silence at the start of the segment. When we slice out
				// our real data with inpoint and outpoint, we'll want remove both the silence
				// and the extra frames we asked for.
				inpoint = durationOf1Frame * 5;
			}

			// inpoint is inclusive and outpoint is exclusive. To avoid overlap, we subtract
			// the duration of one frame from the outpoint.
			// we don't have to subtract a frame if this is the last segment.
			const outpoint = realDuration + inpoint;

			return [`file '${p}'`, `inpoint ${inpoint}us`, `outpoint ${outpoint}us`]
				.filter(truthy)
				.join('\n');
		})
		.join('\n');

	console.log(fileList);

	const fileListTxt = join(filelistDir, 'audio-files.txt');
	writeFileSync(fileListTxt, fileList);

	const command = [
		'-f',
		'concat',
		'-safe',
		'0',
		'-i',
		fileListTxt,
		'-c:a',
		'copy',
		'-vn',
		addRemotionMetadata ? `-metadata` : null,
		addRemotionMetadata ? `comment=Made with Remotion ${VERSION}` : null,
		'-y',
		output,
	];

	try {
		const task = callFf({
			args: command,
			bin: 'ffmpeg',
			indent,
			logLevel,
		});
		task.stderr?.on('data', (data: Buffer) => {
			const parsed = parseFfmpegProgress(data.toString('utf8'));
			if (parsed === undefined) {
				Log.verbose({indent, logLevel}, data.toString('utf8'));
			} else {
				Log.verbose({indent, logLevel}, `Encoded ${parsed} audio frames`);
			}
		});
		await task;
		return output;
	} catch (e) {
		//	rmSync(filelistDir, {recursive: true});
		console.log(e);
		throw e;
	}
};

export const createCombinedAudio = ({
	seamless,
	filelistDir,
	files,
	indent,
	logLevel,
	audioBitrate,
	resolvedAudioCodec,
	output,
	chunkDurationInSeconds,
	addRemotionMetadata,
}: {
	seamless: boolean;
	filelistDir: string;
	files: string[];
	indent: boolean;
	logLevel: LogLevel;
	audioBitrate: string | null;
	resolvedAudioCodec: AudioCodec;
	output: string;
	chunkDurationInSeconds: number;
	addRemotionMetadata: boolean;
}): Promise<string> => {
	if (seamless) {
		return combineAudioSeamlessly({
			filelistDir,
			files,
			indent,
			logLevel,
			output,
			chunkDurationInSeconds,
			addRemotionMetadata,
		});
	}

	return encodeAudio({
		filelistDir,
		files,
		resolvedAudioCodec,
		audioBitrate,
		output,
		indent,
		logLevel,
		addRemotionMetadata,
	});
};