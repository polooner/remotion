import {_Object} from '@aws-sdk/client-s3';
import {RenderMetadata} from '../../shared/constants';
import {getExpectedOutName} from './expected-out-name';
import {getOutputUrlFromMetadata} from './get-output-url-from-metadata';

export const findOutputFileInBucket = ({
	contents,
	renderMetadata,
	bucketName,
}: {
	contents: _Object[];
	renderMetadata: RenderMetadata | null;
	bucketName: string;
}): {
	url: string;
	size: number;
	lastModified: number;
} | null => {
	// TODO: Should query output bucket
	const expectedOutName =
		renderMetadata === null
			? null
			: getExpectedOutName(renderMetadata, bucketName);

	const output = expectedOutName
		? renderMetadata
			? contents.find((c) => c.Key?.includes(expectedOutName.key)) ?? null
			: null
		: null;

	if (!output) {
		return null;
	}

	if (!renderMetadata) {
		throw new Error('unexpectedly did not get renderMetadata');
	}

	return {
		lastModified: output.LastModified?.getTime() as number,
		size: output.Size as number,
		url: getOutputUrlFromMetadata(renderMetadata, bucketName),
	};
};
