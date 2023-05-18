import {ArtifactRegistryClient} from '@google-cloud/artifact-registry';
import {VERSION} from 'remotion/version';

export const validateImageRemotionVersion = async () => {
	const client = new ArtifactRegistryClient();
	const listedTags = await client.listTags({
		parent:
			'projects/remotion-dev/locations/us/repositories/cloud-run/packages/render',
	});

	for (const tag of listedTags[0]) {
		if (VERSION === tag.name?.split('/').pop()) {
			// if match is found, exit the function
			return;
		}
	}

	throw new Error(
		`The tag for Remotion version ${VERSION} was not found in the cloud run registry image.`
	);
};