import { schema } from '../../base';
import { XCollection } from '../public/collection';
import { Directory, IDirectory } from './directory';
import { StandardFileInfo } from './fileinfo';
import { DataResource } from './resource';
import { Application } from './standard/application';
import { Form } from './standard/form';
import { Property } from './standard/property';
import { Species } from './standard/species';
import { Transfer } from './standard/transfer';
export interface IDirectoryOperate {
  /** 是否为空 */
  isEmpty: boolean;
  /** 加载资源 */
  loadResource(reload?: boolean): Promise<void>;
  /** 获取目录内容 */
  getContent<T>(typeNames: string[]): T[];
  /** 接收通知 */
  receiveMessage<T extends schema.XStandard>(
    operate: string,
    data: T,
    coll: XCollection<T>,
    create: (data: T) => StandardFileInfo<T> | undefined,
  ): Promise<boolean>;
}

export class DirectoryOperate implements IDirectoryOperate {
  directory: IDirectory;
  private resource: DataResource;
  standardFiles: StandardFileInfo<schema.XStandard>[] = [];
  constructor(_directory: IDirectory, _resource: DataResource) {
    this.resource = _resource;
    this.directory = _directory;
    if (!_directory.parent) {
      this.subscribe(_resource.formColl, (s) => {
        return new Form(s, this.directory);
      });
      this.subscribe(_resource.propertyColl, (s) => {
        return new Property(s, this.directory);
      });
      this.subscribe(_resource.speciesColl, (s) => {
        return new Species(s, this.directory);
      });
      this.subscribe(_resource.transferColl, (s) => {
        return new Transfer(s, this.directory);
      });
      this.subscribe(_resource.applicationColl, (s) => {
        if (s.parentId.length < 1) {
          return new Application(s, this.directory);
        } else {
          this.loadResource(true);
          this.directory.changCallback();
        }
      });
      this.subscribe(_resource.directoryColl, (s) => {
        return new Directory(s, this.directory.target, this.directory);
      });
    }
  }
  getContent<T>(typeNames: string[]): T[] {
    return this.standardFiles.filter((a) => typeNames.includes(a.typeName)) as T[];
  }

  get isEmpty() {
    return this.standardFiles.length == 0;
  }
  async loadResource(reload: boolean = false): Promise<void> {
    if (!this.directory.parent || reload) {
      await this.resource.preLoad(reload);
    }
    this.standardFiles = [];
    this.standardFiles.push(
      ...this.resource.transferColl.cache
        .filter((i) => i.directoryId === this.directory.id)
        .map((l) => new Transfer(l, this.directory)),
      ...this.resource.formColl.cache
        .filter((i) => i.directoryId === this.directory.id)
        .map((l) => new Form(l, this.directory)),
      ...this.resource.speciesColl.cache
        .filter((i) => i.directoryId === this.directory.id)
        .map((l) => new Species(l, this.directory)),
      ...this.resource.propertyColl.cache
        .filter((i) => i.directoryId === this.directory.id)
        .map((l) => new Property(l, this.directory)),
    );
    var apps = this.resource.applicationColl.cache.filter(
      (i) => i.directoryId === this.directory.id,
    );
    this.standardFiles.push(
      ...apps
        .filter((a) => !a.parentId || a.parentId.length < 1)
        .map((a) => new Application(a, this.directory, undefined, apps)),
    );
    for (const child of this.resource.directoryColl.cache.filter(
      (i) => i.directoryId === this.directory.id,
    )) {
      const subDir = new Directory(child, this.directory.target, this.directory);
      await subDir.loadDirectoryResource();
      this.standardFiles.push(subDir);
    }
  }

  async receiveMessage<T extends schema.XStandard>(
    operate: string,
    data: T,
    coll: XCollection<T>,
    create: (mData: T) => StandardFileInfo<T> | undefined,
  ): Promise<boolean> {
    if (data.directoryId == this.directory.id) {
      switch (operate) {
        case 'insert':
          coll.cache.push(data);
          {
            let standard = create(data);
            if (standard) this.standardFiles.push(standard);
          }
          break;
        case 'replace':
          {
            const index = coll.cache.findIndex((a) => a.id == data.id);
            coll.cache[index] = data;
            this.standardFiles.find((i) => i.id === data.id)?.setMetadata(data);
          }
          break;
        case 'delete':
          await coll.removeCache(data.id);
          this.standardFiles = this.standardFiles.filter((a) => a.id != data.id);
          break;
        case 'refresh':
          this.directory.structCallback();
          break;
      }
      this.directory.changCallback();
      return true;
    } else {
      for (const child of this.standardFiles) {
        if (child.typeName == '目录') {
          await (child as unknown as IDirectory).operater.receiveMessage(
            operate,
            data,
            coll,
            create,
          );
        }
      }
    }
    return false;
  }

  private subscribe<T extends schema.XStandard>(
    coll: XCollection<T>,
    create: (data: T) => StandardFileInfo<T> | undefined,
  ) {
    coll.subscribe(async (a: { operate: string; data: T[] }) => {
      a.data.forEach((s) => {
        this.receiveMessage<T>(a.operate, s, coll, create);
      });
    });
  }
}
