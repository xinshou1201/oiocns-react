import { Button } from 'antd';
import React, { useState, useEffect } from 'react';
import { UserOutlined } from '@ant-design/icons';
import MarketClassifyTree from '@/components/CustomTreeComp';
import cls from './index.module.less';
import userCtrl from '@/ts/controller/setting/userCtrl';
import { IIdentity } from '@/ts/core/target/authority/iidentity';
import AddPosttionModal from '../AddPositionMoadl';
import { IAuthority } from '@/ts/core/target/authority/iauthority';
type CreateGroupPropsType = {
  createTitle: string;
  currentKey: string;
  setCurrent: (current: IIdentity) => void;
  handleMenuClick: (key: string, item: any) => void;
  // 点击操作触发的事件
  positions: IIdentity[];
};
type target = {
  title: string;
  key: string;
  object: IIdentity[];
};
const CreatePosition: React.FC<CreateGroupPropsType> = (props) => {
  useEffect(() => {
    getAuthTree();
  }, []);
  const { positions, setCurrent } = props;
  const [selectMenu, setSelectMenu] = useState<string>('');
  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);
  const [authTree, setAuthTree] = useState<IAuthority[]>();

  const getAuthTree = async () => {
    const data = await userCtrl.Company.selectAuthorityTree();
    if (data) {
      console.log(data.name);
      setAuthTree([data]);
    }
  };
  const changeData = (target: any[]): target[] => {
    const result: target[] = [];
    if (target != undefined) {
      for (const a of target) {
        result.push({
          title: a.name,
          key: a.code,
          object: a,
        });
      }
    } else {
      console.log('空值');
    }
    return result;
  };

  const handleMenuClick = (key: string, data: target) => {
    // 触发内容去变化
    console.log('点击', key, data);
  };
  const close = () => {
    setIsOpenModal(false);
  };
  const onSelect = async (
    selectKeys: string[],
    info: { selected: boolean; node: { object: IIdentity } },
  ) => {
    // 触发内容去变化
    if (info.selected) {
      setCurrent(info.node.object);
    }
  };

  const menu = ['更改岗位名称', '删除'];
  const positionList = (
    <MarketClassifyTree
      searchable
      childIcon={<UserOutlined />}
      key={selectMenu}
      handleMenuClick={handleMenuClick}
      treeData={changeData(positions)}
      menu={menu}
      onSelect={onSelect}
      title={'全部岗位'}
    />
  );

  return (
    <div>
      <div className={cls.topMes}>
        <Button
          className={cls.creatgroup}
          type="primary"
          onClick={() => {
            setIsOpenModal(true);
          }}>
          新增岗位
        </Button>
        {positionList}
      </div>
      <AddPosttionModal
        title={'新增岗位'}
        open={isOpenModal}
        onOk={close}
        handleOk={close}
        authTree={authTree}
      />
    </div>
  );
};

export default CreatePosition;
